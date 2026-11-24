import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  type ContainerChanges,
  makeContainer,
  mirrorWorkspace,
} from "../../../src/features/scratchpad/container.ts"
import {
  type FakeContainerBackend,
  makeFakeContainerBackend,
} from "./fake-container.ts"
import {
  makeMemoryWorkspace,
  type WorkspaceEvent,
  type WorkspaceService,
} from "../../../src/features/scratchpad/workspace.ts"

const SEED = {
  "package.json": "{}",
  "tsconfig.json": "{}",
  "src/main.ts": "console.log(1)",
  "src/util.ts": "export {}",
}

/** Lets the watch debounce (1 ms here) and the rescan run. */
const settle = Effect.promise(
  () => new Promise<void>((resolve) => setTimeout(resolve, 30)),
)

interface Ctx {
  readonly ws: WorkspaceService
  readonly backend: FakeContainerBackend
  /** Every Workspace event since the mount. */
  readonly events: Array<WorkspaceEvent>
  readonly changes: Array<ContainerChanges>
  readonly file: (path: string) => Effect.Effect<string | undefined>
}

const withSync = <A, E>(
  body: (ctx: Ctx) => Effect.Effect<A, E>,
  options: { readonly failWrites?: ReadonlySet<string> } = {},
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const ws = yield* makeMemoryWorkspace({ initialFiles: SEED })
        const backend = makeFakeContainerBackend(options)
        const container = yield* makeContainer(Effect.succeed(backend))
        const changes: Array<ContainerChanges> = []
        yield* mirrorWorkspace(ws, container, {
          watchDebounce: "1 millis",
          onContainerChange: (change) =>
            Effect.sync(() => {
              changes.push(change)
            }),
        })
        yield* settle
        const events: Array<WorkspaceEvent> = []
        yield* ws.events.pipe(
          Stream.runForEach((event) => Effect.sync(() => events.push(event))),
          Effect.forkScoped,
        )
        yield* Effect.yieldNow
        backend.log.length = 0
        return yield* body({
          ws,
          backend,
          events,
          changes,
          file: (path) =>
            ws.readFile(path).pipe(
              Effect.map((content): string | undefined => content),
              Effect.orElseSucceed(() => undefined),
            ),
        })
      }),
    ),
  )

describe("Container → Workspace sync", () => {
  test("files created, changed and deleted in the Container reach the Workspace, tagged and not written back", async () => {
    await withSync(({ ws, backend, events, file }) =>
      Effect.gen(function* () {
        backend.containerWrite("src/extra.ts", "export const extra = 1\n")
        backend.containerWrite("src/main.ts", "console.log(2)")
        backend.containerRemove("src/util.ts")
        yield* settle

        assert.strictEqual(
          yield* file("src/extra.ts"),
          "export const extra = 1\n",
        )
        assert.strictEqual(yield* file("src/main.ts"), "console.log(2)")
        assert.isUndefined(yield* file("src/util.ts"))
        assert.deepStrictEqual(
          events.map((event) => [
            event._tag,
            "path" in event ? event.path : "",
            "origin" in event ? event.origin : undefined,
          ]),
          [
            ["FileCreated", "src/extra.ts", "container"],
            ["FileChanged", "src/main.ts", "container"],
            ["FileDeleted", "src/util.ts", "container"],
          ],
        )
        assert.deepStrictEqual(backend.log, [], "nothing is written back")

        // Page edits after a pull still reach the Container.
        yield* ws.writeFile("src/extra.ts", "export const extra = 2\n")
        yield* settle
        assert.deepStrictEqual(backend.log, ["write src/extra.ts"])
        assert.strictEqual(
          backend.files.get("src/extra.ts"),
          "export const extra = 2\n",
        )
      }),
    )
  })

  test("the page's own writes are not pulled back as changes", async () => {
    await withSync(({ ws, backend, events, changes }) =>
      Effect.gen(function* () {
        yield* ws.writeFile("src/main.ts", "page edit")
        yield* ws.createFile("src/new.ts", "new")
        yield* settle
        assert.deepStrictEqual(backend.log, [
          "write src/main.ts",
          "write src/new.ts",
        ])
        assert.isTrue(
          events.every((event) => !("origin" in event)),
          "no container-tagged events",
        )
        assert.isTrue(changes.every((change) => change.applied.length === 0))
      }),
    )
  })

  test("a Container change to a dirty file is dropped: the editor wins", async () => {
    const failWrites = new Set<string>()
    await withSync(
      ({ ws, backend, file }) =>
        Effect.gen(function* () {
          // The Container never confirms this write, so src/main.ts stays dirty.
          failWrites.add("src/main.ts")
          yield* ws.writeFile("src/main.ts", "page edit")
          yield* settle
          backend.containerWrite("src/main.ts", "terminal edit")
          backend.containerWrite("src/util.ts", "terminal edit")
          yield* settle
          assert.strictEqual(yield* file("src/main.ts"), "page edit")
          assert.strictEqual(
            yield* file("src/util.ts"),
            "terminal edit",
            "clean files still sync",
          )
        }),
      { failWrites },
    )
  })

  test("a file is clean again once the Container has written the page's content", async () => {
    await withSync(({ ws, backend, file }) =>
      Effect.gen(function* () {
        yield* ws.writeFile("src/main.ts", "page edit")
        yield* settle
        backend.containerWrite("src/main.ts", "terminal edit")
        yield* settle
        assert.strictEqual(yield* file("src/main.ts"), "terminal edit")
      }),
    )
  })

  test("Container-only paths, large files and binary files stay in the Container", async () => {
    await withSync(({ ws, backend, events }) =>
      Effect.gen(function* () {
        backend.containerWrite("node_modules/x/index.js", "x")
        backend.containerWrite("dist/main.js", "x")
        backend.containerWrite(".git/HEAD", "x")
        backend.containerWrite(".tsc-run.json", "{}")
        backend.containerWrite("src/lib/node_modules/y.js", "y")
        backend.containerWrite("big.txt", "x".repeat(1024 * 1024 + 1))
        backend.containerWrite("logo.png", new Uint8Array([0x89, 0xff, 0xfe]))
        yield* settle
        assert.deepStrictEqual(events, [])
        assert.deepStrictEqual(
          (yield* ws.listFiles).map((entry) => entry.path),
          ["package.json", "src/main.ts", "src/util.ts", "tsconfig.json"],
        )
      }),
    )
  })

  test("a Workspace file that becomes binary in the Container is kept, not deleted", async () => {
    await withSync(({ backend, file }) =>
      Effect.gen(function* () {
        backend.containerWrite("src/util.ts", new Uint8Array([0xff, 0xfe]))
        yield* settle
        assert.strictEqual(yield* file("src/util.ts"), "export {}")
      }),
    )
  })

  test("protected files deleted in the Container are restored there", async () => {
    await withSync(({ backend, events, file }) =>
      Effect.gen(function* () {
        backend.containerRemove("package.json")
        backend.containerRemove("tsconfig.json")
        yield* settle
        assert.strictEqual(backend.files.get("package.json"), "{}")
        assert.strictEqual(backend.files.get("tsconfig.json"), "{}")
        assert.strictEqual(yield* file("package.json"), "{}")
        assert.deepStrictEqual(events, [])
      }),
    )
  })

  test("edits to protected files sync like any other file", async () => {
    await withSync(({ backend, file }) =>
      Effect.gen(function* () {
        backend.containerWrite("package.json", '{"dependencies":{"a":"1"}}')
        yield* settle
        assert.strictEqual(
          yield* file("package.json"),
          '{"dependencies":{"a":"1"}}',
        )
      }),
    )
  })

  test("a folder deleted in the Container leaves the explorer, folders the page made stay", async () => {
    await withSync(({ ws, backend }) =>
      Effect.gen(function* () {
        backend.containerWrite("src/lib/a.ts", "a")
        backend.containerWrite("src/lib/deep/b.ts", "b")
        yield* ws.createDirectory("notes")
        yield* settle
        backend.containerRemove("src/lib")
        yield* settle
        const snapshot = yield* ws.snapshot
        assert.deepStrictEqual(Object.keys(snapshot.files).sort(), [
          "package.json",
          "src/main.ts",
          "src/util.ts",
          "tsconfig.json",
        ])
        assert.deepStrictEqual(snapshot.directories, ["notes"])
      }),
    )
  })

  test("reports each rescan's applied changes and every watched path", async () => {
    await withSync(({ backend, changes }) =>
      Effect.gen(function* () {
        backend.touch("node_modules/.pnpm/lock.yaml")
        yield* settle
        backend.containerWrite("src/extra.ts", "x")
        backend.touch("node_modules/x/index.d.ts")
        yield* settle
        assert.deepStrictEqual(
          changes.map((change) => ({
            applied: change.applied.map((c) => `${c._tag} ${c.path}`),
            paths: [...change.paths].sort(),
          })),
          [
            { applied: [], paths: ["node_modules/.pnpm/lock.yaml"] },
            {
              applied: ["Write src/extra.ts"],
              paths: ["node_modules/x/index.d.ts", "src/extra.ts"],
            },
          ],
        )
      }),
    )
  })
})
