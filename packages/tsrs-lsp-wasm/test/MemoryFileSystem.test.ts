import { assert, describe, test } from "vite-plus/test"
import {
  FileNotFoundError,
  FileSystemError,
  MemoryFileSystem,
  normalizePath,
  type FileChange,
} from "../src/MemoryFileSystem.ts"

const recorder = (fs: MemoryFileSystem) => {
  const changes: Array<FileChange> = []
  fs.watch((batch) => changes.push(...batch))
  return changes
}

const summary = (changes: ReadonlyArray<FileChange>) =>
  changes.map(
    (c) => `${c.type} ${c.kind === "directory" ? "dir" : "file"} ${c.path}`,
  )

describe("normalizePath", () => {
  test("resolves dot segments, backslashes and duplicate slashes", () => {
    assert.strictEqual(
      normalizePath("workspace//src/./a/../main.ts"),
      "/workspace/src/main.ts",
    )
    assert.strictEqual(normalizePath("\\workspace\\src\\"), "/workspace/src")
    assert.strictEqual(normalizePath("/../.."), "/")
  })
})

describe("MemoryFileSystem", () => {
  test("serves files and implied directories", () => {
    const fs = new MemoryFileSystem({
      "/workspace/src/main.ts": "export {}",
      "/workspace/tsconfig.json": "{}",
    })
    assert.strictEqual(fs.readTextFile("/workspace/src/main.ts"), "export {}")
    assert.isTrue(fs.isDirectory("/workspace/src"))
    assert.isTrue(fs.isDirectory("/"))
    assert.deepStrictEqual(
      fs
        .readDirectory("/workspace")
        .sort((a, b) => a.name.localeCompare(b.name)),
      [
        { name: "src", kind: "directory" },
        { name: "tsconfig.json", kind: "file" },
      ],
    )
    assert.deepStrictEqual(fs.readDirectory("/"), [
      { name: "workspace", kind: "directory" },
    ])
    assert.strictEqual(fs.stat("/workspace/src/main.ts").size, 9)
    assert.strictEqual(fs.stat("/workspace/src").kind, "directory")
  })

  test("throws FileNotFoundError for missing paths", () => {
    const fs = new MemoryFileSystem()
    assert.throws(() => fs.readFile("/nope"), FileNotFoundError)
    assert.throws(() => fs.stat("/nope"), FileNotFoundError)
    assert.throws(() => fs.readDirectory("/nope"), FileNotFoundError)
  })

  test("stores Uint8Array contents without copying", () => {
    const data = new Uint8Array([1, 2, 3])
    const fs = new MemoryFileSystem()
    fs.writeFile("/a.bin", data)
    assert.strictEqual(fs.readFile("/a.bin"), data)
  })

  test("bumps mtime on every write", () => {
    const fs = new MemoryFileSystem()
    fs.writeFile("/a.ts", "1")
    const first = fs.stat("/a.ts").mtimeNs
    fs.writeFile("/a.ts", "2")
    assert.isTrue(fs.stat("/a.ts").mtimeNs > first)
  })

  test("reports writes, including created parent directories", () => {
    const fs = new MemoryFileSystem()
    const changes = recorder(fs)
    fs.writeFile("/workspace/src/a.ts", "a")
    fs.writeFile("/workspace/src/a.ts", "b")
    fs.appendFile("/workspace/src/a.ts", "c")
    assert.strictEqual(fs.readTextFile("/workspace/src/a.ts"), "bc")
    assert.deepStrictEqual(summary(changes), [
      "created dir /workspace",
      "created dir /workspace/src",
      "created file /workspace/src/a.ts",
      "changed file /workspace/src/a.ts",
      "changed file /workspace/src/a.ts",
    ])
  })

  test("mkdir creates empty directories", () => {
    const fs = new MemoryFileSystem()
    const changes = recorder(fs)
    fs.mkdir("/workspace/empty/nested")
    assert.isTrue(fs.isDirectory("/workspace/empty/nested"))
    assert.deepStrictEqual(fs.readDirectory("/workspace/empty"), [
      { name: "nested", kind: "directory" },
    ])
    assert.strictEqual(changes.length, 3)
    fs.mkdir("/workspace/empty")
    assert.strictEqual(changes.length, 3)
  })

  test("removes files and whole directories", () => {
    const fs = new MemoryFileSystem({
      "/w/src/a.ts": "a",
      "/w/src/lib/b.ts": "b",
      "/w/keep.ts": "k",
    })
    const changes = recorder(fs)
    assert.isTrue(fs.remove("/w/src"))
    assert.isFalse(fs.exists("/w/src/lib/b.ts"))
    assert.isFalse(fs.exists("/w/src"))
    assert.isTrue(fs.exists("/w/keep.ts"))
    assert.deepStrictEqual(summary(changes).sort(), [
      "deleted dir /w/src",
      "deleted dir /w/src/lib",
      "deleted file /w/src/a.ts",
      "deleted file /w/src/lib/b.ts",
    ])
    assert.isFalse(fs.remove("/w/src"))
    assert.throws(() => fs.remove("/"), FileSystemError)
  })

  test("renames files, replacing an existing file", () => {
    const fs = new MemoryFileSystem({ "/w/a.ts": "a", "/w/b.ts": "b" })
    const changes = recorder(fs)
    fs.rename("/w/a.ts", "/w/b.ts")
    assert.strictEqual(fs.readTextFile("/w/b.ts"), "a")
    assert.isFalse(fs.exists("/w/a.ts"))
    assert.deepStrictEqual(summary(changes), [
      "deleted file /w/a.ts",
      "changed file /w/b.ts",
    ])
    fs.rename("/w/b.ts", "/w/new/dir/c.ts")
    assert.strictEqual(fs.readTextFile("/w/new/dir/c.ts"), "a")
  })

  test("renames directories with their contents", () => {
    const fs = new MemoryFileSystem({
      "/w/src/a.ts": "a",
      "/w/src/lib/b.ts": "b",
    })
    fs.mkdir("/w/src/empty")
    const changes = recorder(fs)
    fs.rename("/w/src", "/w/app")
    assert.deepStrictEqual(fs.listFiles("/w").sort(), [
      "/w/app/a.ts",
      "/w/app/lib/b.ts",
    ])
    assert.isTrue(fs.isDirectory("/w/app/empty"))
    assert.isFalse(fs.exists("/w/src"))
    const s = summary(changes)
    assert.include(s, "deleted file /w/src/a.ts")
    assert.include(s, "created file /w/app/lib/b.ts")
    assert.include(s, "created dir /w/app/empty")
  })

  test("rejects invalid renames and writes", () => {
    const fs = new MemoryFileSystem({
      "/w/src/a.ts": "a",
      "/w/other/b.ts": "b",
    })
    assert.throws(() => fs.rename("/w/src", "/w/src/inner"), FileSystemError)
    assert.throws(() => fs.rename("/w/src", "/w/other"), FileSystemError)
    assert.throws(() => fs.rename("/w/missing", "/w/x"), FileNotFoundError)
    assert.throws(() => fs.writeFile("/w/src", "x"), FileSystemError)
    assert.throws(
      () => fs.writeFile("/w/src/a.ts/child.ts", "x"),
      FileSystemError,
    )
    assert.throws(() => fs.mkdir("/w/src/a.ts"), FileSystemError)
  })

  test("listFiles filters by directory", () => {
    const fs = new MemoryFileSystem({
      "/w/a.ts": "",
      "/w2/b.ts": "",
      "/w/x/c.ts": "",
    })
    assert.deepStrictEqual(fs.listFiles("/w").sort(), ["/w/a.ts", "/w/x/c.ts"])
    assert.strictEqual(fs.listFiles().length, 3)
  })

  test("watch returns an unsubscribe function", () => {
    const fs = new MemoryFileSystem()
    let calls = 0
    const stop = fs.watch(() => calls++)
    fs.writeFile("/a", "")
    stop()
    fs.writeFile("/b", "")
    assert.strictEqual(calls, 1)
  })
})
