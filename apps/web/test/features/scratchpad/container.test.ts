import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  Container,
  ContainerBootFailed,
  type ContainerBootError,
  makeContainer,
  mirrorWorkspace,
} from "../../../src/features/scratchpad/container.ts"
import {
  type FakeContainerBackend,
  layerFakeContainer,
  makeFakeContainerBackend,
} from "./fake-container.ts"
import {
  makeMemoryWorkspace,
  type WorkspaceService,
} from "../../../src/features/scratchpad/workspace.ts"

const SEED = {
  "package.json": "{}",
  "src/main.ts": "console.log(1)",
  "src/util.ts": "export {}",
}

/** Waits until the fake backend's log has `count` entries (or gives up). */
const awaitLog = (backend: FakeContainerBackend, count: number) =>
  Effect.gen(function* () {
    for (let i = 0; i < 200 && backend.log.length < count; i++) {
      yield* Effect.sleep("1 millis")
    }
  })

const settle = Effect.gen(function* () {
  for (let i = 0; i < 20; i++) yield* Effect.yieldNow
  yield* Effect.sleep("5 millis")
})

/** The Container's files, sorted by path. */
const filesOf = (backend: FakeContainerBackend) =>
  Object.fromEntries([...backend.files].sort(([a], [b]) => a.localeCompare(b)))

/**
 * Runs `body` with a Workspace mirrored into a fake Container whose boot
 * waits for `release`.
 */
const withMirror = <A, E>(
  body: (ctx: {
    readonly ws: WorkspaceService
    readonly backend: FakeContainerBackend
    readonly release: Deferred.Deferred<void, ContainerBootError>
  }) => Effect.Effect<A, E>,
  options: { readonly failWrites?: ReadonlySet<string> } = {},
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const ws = yield* makeMemoryWorkspace({ initialFiles: SEED })
        const backend = makeFakeContainerBackend(options)
        const release = yield* Deferred.make<void, ContainerBootError>()
        const container = yield* makeContainer(
          Deferred.await(release).pipe(Effect.as(backend)),
        )
        yield* mirrorWorkspace(ws, container)
        return yield* body({ ws, backend, release })
      }),
    ),
  )

describe("Container mirror", () => {
  test("edits made while the Container boots land after the mount", async () => {
    await withMirror(({ ws, backend, release }) =>
      Effect.gen(function* () {
        yield* ws.writeFile("src/main.ts", "console.log(2)")
        yield* ws.createFile("src/new.ts", "export const x = 1")
        yield* settle
        yield* Deferred.succeed(release, undefined)
        yield* awaitLog(backend, 5)
        assert.deepStrictEqual(filesOf(backend), {
          "package.json": "{}",
          "src/main.ts": "console.log(2)",
          "src/new.ts": "export const x = 1",
          "src/util.ts": "export {}",
        })
      }),
    )
  })

  test("mirrors renames of files and folders", async () => {
    await withMirror(({ ws, backend, release }) =>
      Effect.gen(function* () {
        yield* Deferred.succeed(release, undefined)
        yield* ws.createFile("lib/a.ts", "a")
        yield* awaitLog(backend, 4)
        backend.log.length = 0
        yield* ws.rename("src/util.ts", "src/helpers.ts")
        yield* ws.rename("lib", "pkg")
        yield* awaitLog(backend, 4)
        assert.deepStrictEqual(filesOf(backend), {
          "package.json": "{}",
          "pkg/a.ts": "a",
          "src/helpers.ts": "export {}",
          "src/main.ts": "console.log(1)",
        })
      }),
    )
  })

  test("removes every file under a deleted folder", async () => {
    await withMirror(({ ws, backend, release }) =>
      Effect.gen(function* () {
        yield* Deferred.succeed(release, undefined)
        yield* ws.createFile("src/lib/a.ts", "a")
        yield* ws.createFile("src/lib/b.ts", "b")
        yield* awaitLog(backend, 5)
        backend.log.length = 0
        yield* ws.remove("src/lib")
        yield* awaitLog(backend, 2)
        assert.deepStrictEqual(Object.keys(filesOf(backend)), [
          "package.json",
          "src/main.ts",
          "src/util.ts",
        ])
      }),
    )
  })

  test("a failed write is skipped and later edits still mirror", async () => {
    await withMirror(
      ({ ws, backend, release }) =>
        Effect.gen(function* () {
          yield* Deferred.succeed(release, undefined)
          yield* awaitLog(backend, 3)
          yield* ws.createFile("src/bad.ts", "x")
          yield* ws.createFile("src/good.ts", "y")
          yield* awaitLog(backend, 5)
          assert.deepStrictEqual(Object.keys(filesOf(backend)), [
            "package.json",
            "src/good.ts",
            "src/main.ts",
            "src/util.ts",
          ])
        }),
      { failWrites: new Set(["src/bad.ts"]) },
    )
  })

  test("a retried boot mounts the Workspace as edited while failed, then mirrors edits", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const ws = yield* makeMemoryWorkspace({ initialFiles: SEED })
          const backend = makeFakeContainerBackend()
          let attempts = 0
          const container = yield* makeContainer(
            Effect.suspend(() =>
              ++attempts === 1
                ? Effect.fail(new ContainerBootFailed({ message: "boom" }))
                : Effect.succeed(backend),
            ),
          )
          yield* mirrorWorkspace(ws, container)
          yield* settle
          yield* ws.writeFile("src/main.ts", "edited while failed")
          yield* settle

          yield* container.retry
          yield* awaitLog(backend, 3)
          yield* ws.writeFile("src/util.ts", "after retry")
          yield* awaitLog(backend, 4)
          assert.deepStrictEqual(filesOf(backend), {
            "package.json": "{}",
            "src/main.ts": "edited while failed",
            "src/util.ts": "after retry",
          })
        }),
      ),
    )
  })

  test("onChange reports the mount, then each edit once it has landed", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const ws = yield* makeMemoryWorkspace({ initialFiles: SEED })
          const backend = makeFakeContainerBackend()
          const container = yield* makeContainer(Effect.succeed(backend))
          const seen: Array<string> = []
          yield* mirrorWorkspace(ws, container, {
            onChange: (change) =>
              Effect.sync(() => {
                seen.push(
                  change._tag === "Mounted"
                    ? `mounted ${Object.keys(change.files).length}`
                    : `${change.event._tag} ${
                        "path" in change.event ? change.event.path : ""
                      } landed=${
                        "path" in change.event &&
                        backend.files.has(change.event.path)
                      }`,
                )
              }),
          })
          yield* settle
          yield* ws.writeHostFile("package.json", '{"a":1}')
          yield* awaitLog(backend, 4)
          yield* settle
          assert.deepStrictEqual(seen, [
            "mounted 3",
            "FileChanged package.json landed=true",
          ])
        }),
      ),
    )
  })
})

describe("Container", () => {
  const runContainer = <A, E>(
    body: (
      container: typeof Container.Service,
      backend: FakeContainerBackend,
    ) => Effect.Effect<A, E>,
    backend: FakeContainerBackend = makeFakeContainerBackend(),
    boot?: Effect.Effect<void, ContainerBootError>,
  ) =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const container = yield* Container
          return yield* body(container, backend)
        }).pipe(Effect.provide(layerFakeContainer(backend, boot))),
      ),
    )

  test("moves from booting to ready", async () => {
    const release = Effect.runSync(Deferred.make<void, ContainerBootError>())
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          const seen: Array<string> = []
          const fiber = yield* container.phaseChanges.pipe(
            Stream.take(2),
            Stream.runForEach((phase) =>
              Effect.sync(() => seen.push(phase._tag)),
            ),
            Effect.forkChild,
          )
          yield* settle
          yield* Deferred.succeed(release, undefined)
          yield* Fiber.join(fiber)
          assert.deepStrictEqual(seen, ["booting", "ready"])
        }),
      undefined,
      Deferred.await(release),
    )
  })

  test("a failed boot fails operations with the boot error", async () => {
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          const error = yield* container.writeFile("a.ts", "").pipe(Effect.flip)
          assert.strictEqual(error._tag, "ContainerBootFailed")
        }),
      undefined,
      Effect.fail(new ContainerBootFailed({ message: "no" })),
    )
  })

  test("retry releases the failed boot before booting again", async () => {
    const events: Array<string> = []
    let attempts = 0
    const boot = Effect.gen(function* () {
      const attempt = ++attempts
      yield* Effect.acquireRelease(
        Effect.sync(() => events.push(`acquire ${attempt}`)),
        () => Effect.sync(() => events.push(`release ${attempt}`)),
      )
      if (attempt === 1) {
        return yield* Effect.fail(new ContainerBootFailed({ message: "no" }))
      }
    })
    const backend = makeFakeContainerBackend()
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const container = yield* makeContainer(boot.pipe(Effect.as(backend)))
          yield* settle
          yield* container.retry
          yield* container.awaitReady
        }),
      ),
    )
    assert.deepStrictEqual(events, [
      "acquire 1",
      "release 1",
      "acquire 2",
      "release 2",
    ])
  })

  test("retry while a retried boot is still running does not boot again", async () => {
    let attempts = 0
    const second = Effect.runSync(Deferred.make<void, ContainerBootError>())
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          yield* settle
          yield* container.retry
          yield* settle
          yield* container.retry
          yield* Deferred.fail(
            second,
            new ContainerBootFailed({ message: "2" }),
          )
          yield* settle
          assert.strictEqual(attempts, 2)
        }),
      undefined,
      Effect.suspend(() =>
        ++attempts === 1
          ? Effect.fail(new ContainerBootFailed({ message: "1" }))
          : Deferred.await(second),
      ),
    )
  })

  test("spawn runs in the given directory with node_modules/.bin on PATH and returns output and exit code", async () => {
    const backend = makeFakeContainerBackend({
      spawn: () => ({ exitCode: 3, output: ["hello ", "world"] }),
    })
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          const proc = yield* container.spawn({
            command: "tsc",
            args: ["--noEmit"],
            cwd: "src",
          })
          const output = yield* proc.output.pipe(Stream.mkString)
          const exitCode = yield* proc.exitCode
          const call = backend.spawned[0]!
          assert.deepStrictEqual(
            {
              output,
              exitCode,
              cwd: call.cwd,
              binOnPath: call.env.PATH!.startsWith("node_modules/.bin:"),
            },
            { output: "hello world", exitCode: 3, cwd: "src", binOnPath: true },
          )
        }).pipe(Effect.scoped),
      backend,
    )
  })

  test("interrupting a spawn kills the process", async () => {
    const backend = makeFakeContainerBackend({
      spawn: () => ({ hang: true }),
    })
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          const fiber = yield* container
            .spawn({ command: "node", args: ["server.js"] })
            .pipe(
              Effect.flatMap((proc) => proc.exitCode),
              Effect.scoped,
              Effect.forkChild,
            )
          yield* settle
          yield* Fiber.interrupt(fiber)
          assert.strictEqual(backend.killed(), 1)
        }),
      backend,
    )
  })
})
