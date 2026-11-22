import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  DEFAULT_SCRATCHPAD_FILES,
  SCRATCHPAD_ROOT_URI,
} from "../../../src/features/scratchpad/config.ts"
import {
  layerMemoryWorkspace,
  pathToWorkspaceUri,
  Workspace,
  type WorkspaceEvent,
  workspaceUriToPath,
} from "../../../src/features/scratchpad/workspace.ts"

describe("Workspace (@effect-vfs/memory)", () => {
  test("seeds initial files, builds sorted tree, and maps URIs both ways", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ws = yield* Workspace
        const tree = yield* ws.getTree
        const files = yield* ws.listFiles
        const stats = yield* ws.stats
        return { tree, files, stats }
      }).pipe(
        Effect.provide(
          layerMemoryWorkspace({
            rootUri: SCRATCHPAD_ROOT_URI,
            initialFiles: DEFAULT_SCRATCHPAD_FILES,
          }),
        ),
      ),
    )

    assert.strictEqual(result.files.length, 2)
    assert.strictEqual(result.stats.fileCount, 2)
    assert.isAbove(result.stats.totalBytes, 0)
    assert.strictEqual(result.tree.length, 1)
    assert.strictEqual(result.tree[0]?._tag, "Directory")
    if (result.tree[0]?._tag === "Directory") {
      assert.strictEqual(result.tree[0].name, "src")
      assert.deepStrictEqual(
        result.tree[0].children.map((c) => c.path),
        ["src/greeter.ts", "src/main.ts"],
      )
    }

    assert.strictEqual(
      pathToWorkspaceUri("src/main.ts"),
      "file:///workspace/src/main.ts",
    )
    assert.strictEqual(
      workspaceUriToPath("file:///workspace/src/main.ts"),
      "src/main.ts",
    )
    assert.isUndefined(
      workspaceUriToPath("file:///workspace/node_modules/effect/index.d.ts"),
    )
    assert.isUndefined(workspaceUriToPath("file:///workspace/tsconfig.json"))
  })

  test("supports create, write, rename (file and directory), remove, and emits events", async () => {
    const events: Array<WorkspaceEvent> = []

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const ws = yield* Workspace
          const subFiber = yield* ws.events.pipe(
            Stream.runForEach((ev) =>
              Effect.sync(() => {
                events.push(ev)
              }),
            ),
            Effect.forkScoped,
          )
          yield* Effect.yieldNow

          yield* ws.createFile(
            "src/utils/math.ts",
            "export const add = (a: number, b: number) => a + b\n",
          )
          assert.include(
            yield* ws.readFile("src/utils/math.ts"),
            "export const add",
          )

          yield* ws.writeFile(
            "src/utils/math.ts",
            "export const add = (a: number, b: number) => a + b + 0\n",
          )
          yield* ws.rename("src/utils", "src/helpers")

          const renamedContent = yield* ws.readFile("src/helpers/math.ts")
          assert.include(renamedContent, "+ 0")

          yield* ws.remove("src/helpers")
          const afterRemove = yield* ws.listFiles
          assert.deepStrictEqual(
            afterRemove.map((f) => f.path),
            ["src/main.ts"],
          )

          yield* Effect.yieldNow
          yield* Fiber.interrupt(subFiber)
        }),
      ).pipe(
        Effect.provide(
          layerMemoryWorkspace({
            initialFiles: { "src/main.ts": "export const x = 1\n" },
          }),
        ),
      ),
    )

    assert.isTrue(
      events.some(
        (e) => e._tag === "FileCreated" && e.path === "src/utils/math.ts",
      ),
    )
    assert.isTrue(
      events.some(
        (e) => e._tag === "FileChanged" && e.path === "src/utils/math.ts",
      ),
    )
    assert.isTrue(
      events.some(
        (e) =>
          e._tag === "FileRenamed" &&
          e.oldPath === "src/utils/math.ts" &&
          e.newPath === "src/helpers/math.ts",
      ),
    )
    assert.isTrue(
      events.some(
        (e) => e._tag === "FileDeleted" && e.path === "src/helpers/math.ts",
      ),
    )
  })

  test("enforces extension rules, reserved paths, file count, and byte limits", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const ws = yield* Workspace

        const badExt = yield* Effect.exit(ws.createFile("src/readme.md", "hi"))
        assert.isTrue(Exit.isFailure(badExt))

        const badTsconfig = yield* Effect.exit(
          ws.createFile("tsconfig.json", "{}"),
        )
        assert.isTrue(Exit.isFailure(badTsconfig))

        const badNm = yield* Effect.exit(
          ws.createFile("node_modules/foo.ts", ""),
        )
        assert.isTrue(Exit.isFailure(badNm))

        const tooBigFile = yield* Effect.exit(
          ws.createFile("src/big.ts", "a".repeat(200)),
        )
        assert.isTrue(Exit.isFailure(tooBigFile))

        yield* ws.createFile("src/a.ts", "a".repeat(60))
        yield* ws.createFile("src/b.ts", "b".repeat(60))

        // Exceeds maxFiles (3 total including src/main.ts)
        const tooMany = yield* Effect.exit(ws.createFile("src/c.ts", "c"))
        assert.isTrue(Exit.isFailure(tooMany))
      }).pipe(
        Effect.provide(
          layerMemoryWorkspace({
            initialFiles: { "src/main.ts": "x" },
            limits: {
              maxFiles: 3,
              maxFileBytes: 100,
              maxTotalBytes: 250,
            },
          }),
        ),
      ),
    )
  })

  test("round-trips portable snapshots including empty directories", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const ws = yield* Workspace
        yield* ws.createDirectory("src/empty")
        const snap = yield* ws.snapshot

        assert.strictEqual(snap.version, 1)
        assert.deepStrictEqual(snap.directories, ["src/empty"])
        assert.strictEqual(snap.files["src/main.ts"], "export const a = 1\n")

        yield* ws.remove("src/empty")
        yield* ws.writeFile("src/main.ts", "export const a = 2\n")
        yield* ws.restoreSnapshot(snap)

        assert.strictEqual(
          yield* ws.readFile("src/main.ts"),
          "export const a = 1\n",
        )
        const tree = yield* ws.getTree
        const src = tree[0]
        assert.strictEqual(src?._tag, "Directory")
        if (src?._tag === "Directory") {
          assert.isTrue(
            src.children.some(
              (c) => c._tag === "Directory" && c.path === "src/empty",
            ),
          )
        }
      }).pipe(
        Effect.provide(
          layerMemoryWorkspace({
            initialFiles: { "src/main.ts": "export const a = 1\n" },
          }),
        ),
      ),
    )
  })
})
