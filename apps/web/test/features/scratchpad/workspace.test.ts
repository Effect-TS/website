import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import { SCRATCHPAD_ROOT_URI } from "../../../src/features/scratchpad/config.ts"
import {
  layerMemoryWorkspace,
  pathToWorkspaceUri,
  Workspace,
  type WorkspaceError,
  type WorkspaceErrorCode,
  type WorkspaceEvent,
  type WorkspaceLimits,
  type WorkspaceService,
  workspaceUriToPath,
} from "../../../src/features/scratchpad/workspace.ts"
import { GREETER_FILES } from "./fixtures.ts"

const runWorkspace = <A>(
  body: (ws: WorkspaceService) => Effect.Effect<A, WorkspaceError>,
  options: {
    readonly initialFiles?: Readonly<Record<string, string>>
    readonly limits?: WorkspaceLimits
  } = {},
): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      return yield* body(yield* Workspace)
    }).pipe(Effect.provide(layerMemoryWorkspace(options))),
  )

/** Runs `body` while recording every Workspace event it causes. */
const recordEvents = (
  body: (ws: WorkspaceService) => Effect.Effect<void, WorkspaceError>,
  initialFiles: Readonly<Record<string, string>>,
): Promise<ReadonlyArray<WorkspaceEvent>> => {
  const events: Array<WorkspaceEvent> = []
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const ws = yield* Workspace
        const fiber = yield* ws.events.pipe(
          Stream.runForEach((ev) => Effect.sync(() => events.push(ev))),
          Effect.forkScoped,
        )
        yield* Effect.yieldNow
        yield* body(ws)
        yield* Effect.yieldNow
        yield* Fiber.interrupt(fiber)
      }),
    ).pipe(Effect.provide(layerMemoryWorkspace({ initialFiles }))),
  ).then(() => events)
}

const failureCode = <A>(
  effect: Effect.Effect<A, WorkspaceError>,
): Effect.Effect<WorkspaceErrorCode | undefined> =>
  Effect.exit(effect).pipe(
    Effect.map((exit) =>
      Exit.isFailure(exit)
        ? exit.cause.reasons.find((r) => r._tag === "Fail")?.error.code
        : undefined,
    ),
  )

const SEED = {
  "package.json": '{ "name": "scratchpad" }\n',
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  "tsconfig.json": "{}\n",
  "src/main.ts": "export const x = 1\n",
}

describe("Workspace (in-memory store)", () => {
  test("seeds initial files, builds sorted tree, and maps URIs both ways", async () => {
    const result = await runWorkspace(
      (ws) => Effect.all({ tree: ws.getTree, files: ws.listFiles }),
      { initialFiles: GREETER_FILES },
    )

    assert.deepStrictEqual(
      result.files.map((f) => f.path),
      ["src/greeter.ts", "src/main.ts"],
    )
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
      pathToWorkspaceUri("src/main.ts", SCRATCHPAD_ROOT_URI),
      "file:///workspace/src/main.ts",
    )
    assert.strictEqual(
      workspaceUriToPath("file:///workspace/src/main.ts"),
      "src/main.ts",
    )
    assert.strictEqual(
      workspaceUriToPath("file:///workspace/tsconfig.json"),
      "tsconfig.json",
    )
    assert.isUndefined(
      workspaceUriToPath("file:///workspace/node_modules/effect/index.d.ts"),
    )
    assert.isUndefined(workspaceUriToPath("file:///workspace/dist/main.js"))
  })

  test("lists directories before files at every level of the tree", async () => {
    const tree = await runWorkspace((ws) => ws.getTree, {
      initialFiles: {
        "z.md": "z",
        "a.json": "{}",
        "lib/b.ts": "b",
        "lib/a/c.ts": "c",
      },
    })
    assert.deepStrictEqual(
      tree.map((n) => n.path),
      ["lib", "a.json", "z.md"],
    )
    const lib = tree[0]
    assert.strictEqual(lib?._tag, "Directory")
    if (lib?._tag === "Directory") {
      assert.deepStrictEqual(
        lib.children.map((n) => n.path),
        ["lib/a", "lib/b.ts"],
      )
    }
  })

  test("supports create, write, rename (file and directory), remove, and emits events", async () => {
    const events = await recordEvents(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.createFile("src/utils/math.ts", "export const add = 1\n")
          yield* ws.createFile("src/utils/sub.ts", "export const sub = 1\n")
          assert.include(
            yield* ws.readFile("src/utils/math.ts"),
            "export const add",
          )
          yield* ws.writeFile("src/utils/math.ts", "export const add = 2\n")
          yield* ws.rename("src/utils", "src/helpers")
          assert.strictEqual(
            yield* ws.readFile("src/helpers/math.ts"),
            "export const add = 2\n",
          )
          yield* ws.remove("src/helpers")
          assert.deepStrictEqual(
            (yield* ws.listFiles).map((f) => f.path),
            ["src/main.ts"],
          )
        }),
      { "src/main.ts": "export const x = 1\n" },
    )

    assert.deepStrictEqual(events, [
      {
        _tag: "FileCreated",
        path: "src/utils/math.ts",
        content: "export const add = 1\n",
      },
      {
        _tag: "FileCreated",
        path: "src/utils/sub.ts",
        content: "export const sub = 1\n",
      },
      {
        _tag: "FileChanged",
        path: "src/utils/math.ts",
        content: "export const add = 2\n",
      },
      {
        _tag: "FileRenamed",
        oldPath: "src/utils/math.ts",
        newPath: "src/helpers/math.ts",
        content: "export const add = 2\n",
      },
      {
        _tag: "FileRenamed",
        oldPath: "src/utils/sub.ts",
        newPath: "src/helpers/sub.ts",
        content: "export const sub = 1\n",
      },
      { _tag: "DirectoryChanged" },
      { _tag: "FileDeleted", path: "src/helpers/math.ts" },
      { _tag: "FileDeleted", path: "src/helpers/sub.ts" },
      { _tag: "DirectoryChanged" },
    ])
  })

  test("accepts any text file, including tsconfig.json, and reserves node_modules and dist", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.createFile("README.md", "# hi\n")
          yield* ws.createFile("dprint.json", "{}\n")
          yield* ws.createFile("scripts/Makefile", "all:\n")
          yield* ws.createFile("tsconfig.json", "{}\n")
          yield* ws.writeFile("tsconfig.json", '{ "strict": true }\n')
          assert.strictEqual(
            yield* ws.readFile("tsconfig.json"),
            '{ "strict": true }\n',
          )

          assert.strictEqual(
            yield* failureCode(ws.createFile("node_modules/foo.ts", "")),
            "invalid-path",
          )
          assert.strictEqual(
            yield* failureCode(ws.createFile("dist/main.js", "")),
            "invalid-path",
          )
          assert.strictEqual(
            yield* failureCode(ws.createDirectory("dist")),
            "invalid-path",
          )
          assert.strictEqual(
            yield* failureCode(ws.rename("README.md", "dist/README.md")),
            "invalid-path",
          )
          // Only the top-level folders are reserved.
          yield* ws.createFile("src/dist/x.ts", "")
        }),
      { initialFiles: { "src/main.ts": "x" } },
    )
  })

  test("enforces file count and byte limits", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          assert.strictEqual(
            yield* failureCode(ws.createFile("src/big.ts", "a".repeat(101))),
            "file-too-large",
          )

          yield* ws.createFile("src/a.ts", "a".repeat(100))
          yield* ws.createFile("src/b.ts", "b".repeat(100))
          assert.strictEqual(
            yield* failureCode(ws.createFile("src/c.ts", "c")),
            "too-many-files",
          )

          // 1 + 100 + 100 = 201 bytes: b cannot grow past 100, and main.ts at 51 bytes
          // takes the total to 251.
          assert.strictEqual(
            yield* failureCode(
              ws.writeFile("src/b.ts", "b".repeat(100) + "b".repeat(50)),
            ),
            "file-too-large",
          )
          assert.strictEqual(
            yield* failureCode(ws.writeFile("src/main.ts", "m".repeat(51))),
            "workspace-too-large",
          )
          // A failed write changes nothing.
          assert.strictEqual(yield* ws.readFile("src/b.ts"), "b".repeat(100))
          assert.strictEqual(yield* ws.readFile("src/main.ts"), "x")
        }),
      {
        initialFiles: { "src/main.ts": "x" },
        limits: { maxFiles: 3, maxFileBytes: 100, maxTotalBytes: 250 },
      },
    )
  })

  test("counts UTF-8 bytes against the total limit across renames and snapshot restores", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          // "é" is two bytes in UTF-8, so the seed takes 3 of 10 bytes.
          assert.strictEqual(
            yield* failureCode(ws.createFile("src/a.ts", "a".repeat(8))),
            "workspace-too-large",
          )
          yield* ws.createFile("src/a.ts", "a".repeat(7))

          // A rename moves bytes without adding or dropping any.
          yield* ws.rename("src", "lib")
          assert.strictEqual(
            yield* failureCode(ws.createFile("x.ts", "x")),
            "workspace-too-large",
          )
          yield* ws.remove("lib/a.ts")
          yield* ws.createFile("x.ts", "x".repeat(7))

          // A restore replaces the total with the snapshot's.
          yield* ws.restoreSnapshot({
            version: 1,
            files: { "a.ts": "12345", "b.ts": "1" },
          })
          yield* ws.createFile("c.ts", "cccc")
          assert.strictEqual(
            yield* failureCode(ws.createFile("d.ts", "d")),
            "workspace-too-large",
          )
        }),
      {
        initialFiles: { "src/é.ts": "é1" },
        limits: { maxTotalBytes: 10 },
      },
    )
  })

  test("frees room under the total limit when a file shrinks or is removed", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.writeFile("a.ts", "a".repeat(10))
          yield* ws.createFile("b.ts", "b".repeat(90))
          yield* ws.remove("b.ts")
          yield* ws.createFile("c.ts", "c".repeat(90))
        }),
      {
        initialFiles: { "a.ts": "a".repeat(100) },
        limits: { maxTotalBytes: 100 },
      },
    )
  })

  test("package.json and pnpm-lock.yaml are read-only to editor writes", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          assert.strictEqual(
            yield* failureCode(ws.writeFile("package.json", "{}")),
            "read-only",
          )
          assert.strictEqual(
            yield* failureCode(ws.writeFile("/pnpm-lock.yaml", "")),
            "read-only",
          )
          assert.strictEqual(
            yield* ws.readFile("package.json"),
            SEED["package.json"],
          )
          // Writing tsconfig.json and src/main.ts is fine.
          yield* ws.writeFile("tsconfig.json", '{ "strict": true }\n')
          yield* ws.writeFile("src/main.ts", "export {}\n")
        }),
      { initialFiles: SEED },
    )
  })

  test("an editor cannot create a read-only file or rename a file onto one", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          assert.strictEqual(
            yield* failureCode(ws.createFile("package.json", "{}")),
            "read-only",
          )
          yield* ws.createFile("lock.yaml", "")
          assert.strictEqual(
            yield* failureCode(ws.rename("lock.yaml", "pnpm-lock.yaml")),
            "read-only",
          )
          // The names are only reserved at the root.
          yield* ws.createFile("packages/a/package.json", "{}")
        }),
      { initialFiles: { "src/main.ts": "" } },
    )
  })

  test("protected files cannot be deleted or renamed, nor can folders holding them", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          for (const path of Object.keys(SEED)) {
            assert.strictEqual(
              yield* failureCode(ws.remove(path)),
              "protected",
              path,
            )
            assert.strictEqual(
              yield* failureCode(
                ws.rename(path, `renamed-${path.replace("/", "-")}`),
              ),
              "protected",
              path,
            )
          }
          assert.strictEqual(yield* failureCode(ws.remove("src")), "protected")
          assert.strictEqual(
            yield* failureCode(ws.rename("src", "lib")),
            "protected",
          )
          assert.deepStrictEqual(
            (yield* ws.listFiles).map((f) => f.path),
            ["package.json", "pnpm-lock.yaml", "src/main.ts", "tsconfig.json"],
          )
        }),
      { initialFiles: SEED },
    )
  })

  test("the host write path can create and update read-only files and emits the usual events", async () => {
    const events = await recordEvents(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.writeHostFile("package.json", '{ "name": "a" }\n')
          yield* ws.writeHostFile("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
          assert.strictEqual(
            yield* ws.readFile("pnpm-lock.yaml"),
            "lockfileVersion: '9.0'\n",
          )
          assert.strictEqual(
            yield* failureCode(ws.writeHostFile("dist/x.js", "")),
            "invalid-path",
          )
        }),
      { "package.json": "{}\n", "src/main.ts": "" },
    )
    assert.deepStrictEqual(events, [
      {
        _tag: "FileChanged",
        path: "package.json",
        content: '{ "name": "a" }\n',
      },
      {
        _tag: "FileCreated",
        path: "pnpm-lock.yaml",
        content: "lockfileVersion: '9.0'\n",
      },
    ])
  })

  test("the host write path still respects the limits", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          assert.strictEqual(
            yield* failureCode(
              ws.writeHostFile("pnpm-lock.yaml", "x".repeat(11)),
            ),
            "file-too-large",
          )
        }),
      { initialFiles: { "src/main.ts": "" }, limits: { maxFileBytes: 10 } },
    )
  })

  test("rejects files and folders that collide with each other", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          assert.strictEqual(
            yield* failureCode(ws.createFile("src", "")),
            "already-exists",
          )
          assert.strictEqual(
            yield* failureCode(ws.createDirectory("src/main.ts")),
            "already-exists",
          )
          assert.strictEqual(
            yield* failureCode(ws.createFile("src/main.ts/x.ts", "")),
            "invalid-path",
          )
          assert.strictEqual(
            yield* failureCode(ws.readFile("src")),
            "not-found",
          )
          assert.strictEqual(
            yield* failureCode(ws.rename("src", "src/inner")),
            "invalid-path",
          )
          assert.strictEqual(
            yield* failureCode(ws.remove("missing.ts")),
            "not-found",
          )
        }),
      { initialFiles: { "src/main.ts": "", "src/a.ts": "" } },
    )
  })

  test("round-trips portable snapshots including empty directories", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.createDirectory("src/empty")
          const snap = yield* ws.snapshot

          assert.strictEqual(snap.version, 1)
          assert.deepStrictEqual(snap.directories, ["src/empty"])
          assert.deepStrictEqual(snap.files, {
            "src/main.ts": "export const a = 1\n",
            "package.json": "{}\n",
          })

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
        }),
      {
        initialFiles: {
          "src/main.ts": "export const a = 1\n",
          "package.json": "{}\n",
        },
      },
    )
  })

  test("restoring a snapshot over the limits leaves the Workspace untouched", async () => {
    await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          assert.strictEqual(
            yield* failureCode(
              ws.restoreSnapshot({
                version: 1,
                files: { "a.ts": "aaaa", "b.ts": "bbbb" },
              }),
            ),
            "workspace-too-large",
          )
          assert.deepStrictEqual(
            (yield* ws.listFiles).map((f) => f.path),
            ["src/main.ts"],
          )
        }),
      { initialFiles: { "src/main.ts": "x" }, limits: { maxTotalBytes: 5 } },
    )
  })
})
