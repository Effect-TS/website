import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  layerMemoryWorkspace,
  Workspace,
  type WorkspaceError,
  type WorkspaceErrorCode,
  type WorkspaceEvent,
  type WorkspaceLimits,
  type WorkspaceNode,
  type WorkspaceService,
  workspaceUriToPath,
} from "../../../src/features/scratchpad/workspace.ts"

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

/** A tree as nested paths: a directory is `[path, children]`. */
type Outline = ReadonlyArray<string | readonly [string, Outline]>
const outline = (nodes: ReadonlyArray<WorkspaceNode>): Outline =>
  nodes.map((n) =>
    n._tag === "Directory" ? ([n.path, outline(n.children)] as const) : n.path,
  )

describe("Workspace (in-memory store)", () => {
  test("the tree lists directories before files, each sorted by name, at every level", async () => {
    const tree = await runWorkspace((ws) => ws.getTree, {
      initialFiles: {
        "z.md": "z",
        "a.json": "{}",
        "lib/b.ts": "b",
        "lib/a/c.ts": "c",
      },
    })
    assert.deepStrictEqual(outline(tree), [
      ["lib", [["lib/a", ["lib/a/c.ts"]], "lib/b.ts"]],
      "a.json",
      "z.md",
    ])
  })

  test("Workspace URIs map to paths, except installed and built files", () => {
    assert.deepStrictEqual(
      [
        "file:///workspace/src/main.ts",
        "file:///workspace/tsconfig.json",
        "file:///workspace/node_modules/effect/index.d.ts",
        "file:///workspace/dist/main.js",
      ].map((uri) => workspaceUriToPath(uri)),
      ["src/main.ts", "tsconfig.json", undefined, undefined],
    )
  })

  test("renaming a folder moves the files inside it", async () => {
    const files = await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.rename("src/utils", "src/helpers")
          return yield* ws.listFiles
        }),
      { initialFiles: { "src/utils/math.ts": "add", "src/main.ts": "main" } },
    )
    assert.deepStrictEqual(files, [
      { path: "src/helpers/math.ts", content: "add" },
      { path: "src/main.ts", content: "main" },
    ])
  })

  test("every change emits an event per affected file", async () => {
    const events = await recordEvents(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.createFile("src/utils/math.ts", "1")
          yield* ws.writeFile("src/utils/math.ts", "2")
          yield* ws.rename("src/utils", "src/helpers")
          yield* ws.remove("src/helpers")
        }),
      { "src/main.ts": "" },
    )
    assert.deepStrictEqual(events, [
      { _tag: "FileCreated", path: "src/utils/math.ts", content: "1" },
      { _tag: "FileChanged", path: "src/utils/math.ts", content: "2" },
      {
        _tag: "FileRenamed",
        oldPath: "src/utils/math.ts",
        newPath: "src/helpers/math.ts",
        content: "2",
      },
      { _tag: "DirectoryChanged" },
      { _tag: "FileDeleted", path: "src/helpers/math.ts" },
      { _tag: "DirectoryChanged" },
    ])
  })

  test("node_modules and dist are reserved for the Container", async () => {
    const codes = await runWorkspace(
      (ws) =>
        Effect.all([
          failureCode(ws.createFile("node_modules/foo.ts", "")),
          failureCode(ws.createDirectory("dist")),
        ]),
      { initialFiles: { "src/main.ts": "x" } },
    )
    assert.deepStrictEqual(codes, ["invalid-path", "invalid-path"])
  })

  test("files and folders cannot take each other's paths", async () => {
    const codes = await runWorkspace(
      (ws) =>
        Effect.all([
          failureCode(ws.createFile("src", "")),
          failureCode(ws.createDirectory("src/main.ts")),
          failureCode(ws.rename("src", "src/inner")),
        ]),
      { initialFiles: { "src/main.ts": "" } },
    )
    assert.deepStrictEqual(codes, [
      "already-exists",
      "already-exists",
      "invalid-path",
    ])
  })

  test("enforces the file size, file count and total size limits", async () => {
    const codes = await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          const tooLarge = yield* failureCode(
            ws.createFile("src/big.ts", "a".repeat(101)),
          )
          yield* ws.createFile("src/a.ts", "a".repeat(100))
          const overTotal = yield* failureCode(
            ws.writeFile("src/main.ts", "m".repeat(100)),
          )
          yield* ws.createFile("src/b.ts", "b")
          const tooMany = yield* failureCode(ws.createFile("src/c.ts", "c"))
          return [tooLarge, overTotal, tooMany]
        }),
      {
        initialFiles: { "src/main.ts": "x" },
        limits: { maxFiles: 3, maxFileBytes: 100, maxTotalBytes: 150 },
      },
    )
    assert.deepStrictEqual(codes, [
      "file-too-large",
      "workspace-too-large",
      "too-many-files",
    ])
  })

  test("the total size limit counts UTF-8 bytes", async () => {
    // "é" is two bytes in UTF-8, so the seed takes 3 of 10 bytes.
    const code = await runWorkspace(
      (ws) => failureCode(ws.createFile("src/a.ts", "a".repeat(8))),
      { initialFiles: { "src/é.ts": "é1" }, limits: { maxTotalBytes: 10 } },
    )
    assert.strictEqual(code, "workspace-too-large")
  })

  test("shrinking, removing or restoring a smaller snapshot frees room under the total limit", async () => {
    const code = await runWorkspace(
      (ws) =>
        failureCode(
          Effect.gen(function* () {
            yield* ws.writeFile("a.ts", "a".repeat(10))
            yield* ws.createFile("b.ts", "b".repeat(90))
            yield* ws.remove("b.ts")
            yield* ws.createFile("c.ts", "c".repeat(90))
            yield* ws.restoreSnapshot({ version: 1, files: { "a.ts": "a" } })
            yield* ws.createFile("d.ts", "d".repeat(99))
          }),
        ),
      {
        initialFiles: { "a.ts": "a".repeat(100) },
        limits: { maxTotalBytes: 100 },
      },
    )
    assert.isUndefined(code)
  })

  test("the editor cannot write, create or rename onto package.json and pnpm-lock.yaml", async () => {
    const codes = await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.createFile("lock.yaml", "")
          return yield* Effect.all([
            failureCode(ws.writeFile("package.json", "{}")),
            failureCode(ws.createFile("/pnpm-lock.yaml", "")),
            failureCode(ws.rename("lock.yaml", "pnpm-lock.yaml")),
          ])
        }),
      { initialFiles: { "package.json": "{}", "src/main.ts": "" } },
    )
    assert.deepStrictEqual(codes, ["read-only", "read-only", "read-only"])
  })

  test("the host can write package.json and pnpm-lock.yaml", async () => {
    const content = await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.writeHostFile("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
          return yield* ws.readFile("pnpm-lock.yaml")
        }),
      { initialFiles: { "src/main.ts": "" } },
    )
    assert.strictEqual(content, "lockfileVersion: '9.0'\n")
  })

  test("the seed files, and the folder holding one, cannot be deleted or renamed", async () => {
    const codes = await runWorkspace(
      (ws) =>
        Effect.all([
          failureCode(ws.remove("package.json")),
          failureCode(ws.rename("tsconfig.json", "ts.json")),
          failureCode(ws.remove("src")),
        ]),
      { initialFiles: SEED },
    )
    assert.deepStrictEqual(codes, ["protected", "protected", "protected"])
  })

  test("a snapshot restores the files and empty folders it was taken from", async () => {
    const restored = await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* ws.createDirectory("src/empty")
          const snap = yield* ws.snapshot
          yield* ws.remove("src/empty")
          yield* ws.writeFile("src/main.ts", "export const a = 2\n")
          yield* ws.restoreSnapshot(snap)
          return yield* ws.snapshot
        }),
      { initialFiles: { "src/main.ts": "export const a = 1\n" } },
    )
    assert.deepStrictEqual(restored, {
      version: 1,
      files: { "src/main.ts": "export const a = 1\n" },
      directories: ["src/empty"],
    })
  })

  test("restoring a snapshot over the limits leaves the Workspace untouched", async () => {
    const files = await runWorkspace(
      (ws) =>
        Effect.gen(function* () {
          yield* failureCode(
            ws.restoreSnapshot({
              version: 1,
              files: { "a.ts": "aaaa", "b.ts": "bbbb" },
            }),
          )
          return yield* ws.listFiles
        }),
      { initialFiles: { "src/main.ts": "x" }, limits: { maxTotalBytes: 5 } },
    )
    assert.deepStrictEqual(files, [{ path: "src/main.ts", content: "x" }])
  })
})
