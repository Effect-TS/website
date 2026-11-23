import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  Container,
  ContainerBootFailed,
  type ContainerBootError,
  type ContainerPhase,
  type FakeContainerBackend,
  jsh,
  layerFakeContainer,
  makeFakeContainerBackend,
  makeContainer,
  mirrorWorkspace,
} from "../../../src/features/scratchpad/container.ts"
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

/**
 * Runs `body` with a Workspace mirrored into a fake Container whose boot
 * waits for `release` (succeed to boot, fail to fail boot).
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
  test("mounts the Workspace once booted, then applies edits made during boot in order", async () => {
    await withMirror(({ ws, backend, release }) =>
      Effect.gen(function* () {
        yield* ws.writeFile("src/main.ts", "console.log(2)")
        yield* ws.createFile("src/new.ts", "export const x = 1")
        yield* settle
        assert.deepStrictEqual(backend.log, [], "nothing lands before boot")

        yield* Deferred.succeed(release, undefined)
        yield* awaitLog(backend, 5)

        assert.deepStrictEqual(backend.log.slice(0, 3).sort(), [
          "write package.json",
          "write src/main.ts",
          "write src/util.ts",
        ])
        assert.deepStrictEqual(backend.log.slice(3), [
          "write src/main.ts",
          "write src/new.ts",
        ])
        assert.strictEqual(backend.files.get("src/main.ts"), "console.log(2)")
        assert.strictEqual(
          backend.files.get("src/new.ts"),
          "export const x = 1",
        )
      }),
    )
  })

  test("maps a rename to a write of the new path then a removal of the old one", async () => {
    await withMirror(({ ws, backend, release }) =>
      Effect.gen(function* () {
        yield* Deferred.succeed(release, undefined)
        yield* ws.createFile("lib/a.ts", "a")
        yield* awaitLog(backend, 4)
        backend.log.length = 0

        yield* ws.rename("src/util.ts", "src/helpers.ts")
        yield* ws.rename("lib", "pkg")
        yield* awaitLog(backend, 4)

        assert.deepStrictEqual(backend.log, [
          "write src/helpers.ts",
          "remove src/util.ts",
          "write pkg/a.ts",
          "remove lib/a.ts",
        ])
        assert.deepStrictEqual([...backend.files.keys()].sort(), [
          "package.json",
          "pkg/a.ts",
          "src/helpers.ts",
          "src/main.ts",
        ])
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

        assert.deepStrictEqual(backend.log.sort(), [
          "remove src/lib/a.ts",
          "remove src/lib/b.ts",
        ])
        assert.isFalse(backend.files.has("src/lib/a.ts"))
        assert.isTrue(backend.files.has("src/main.ts"))
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
          assert.isFalse(backend.files.has("src/bad.ts"))
          assert.strictEqual(backend.files.get("src/good.ts"), "y")
        }),
      { failWrites: new Set(["src/bad.ts"]) },
    )
  })

  test("a Container that fails to boot leaves the Workspace editable", async () => {
    await withMirror(({ ws, backend, release }) =>
      Effect.gen(function* () {
        yield* Deferred.fail(
          release,
          new ContainerBootFailed({ message: "boom" }),
        )
        yield* settle
        yield* ws.writeFile("src/main.ts", "still editing")
        yield* ws.createFile("src/other.ts", "")
        yield* settle

        assert.strictEqual(yield* ws.readFile("src/main.ts"), "still editing")
        assert.deepStrictEqual(backend.log, [])
      }),
    )
  })
})

describe("Container mirror after a retry", () => {
  test("mounts the Workspace as it is when a retried boot succeeds, then mirrors edits", async () => {
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
          const mounts: Array<number> = []
          yield* mirrorWorkspace(ws, container, {
            onChange: (change) =>
              Effect.sync(() => {
                if (change._tag === "Mounted") {
                  mounts.push(Object.keys(change.files).length)
                }
              }),
          })
          yield* settle
          assert.strictEqual((yield* container.phase)._tag, "failed")

          // Edits while failed stay in the Workspace.
          yield* ws.writeFile("src/main.ts", "edited while failed")
          yield* ws.createFile("src/new.ts", "new")
          yield* settle
          assert.deepStrictEqual(backend.log, [])

          yield* container.retry
          yield* awaitLog(backend, 4)
          yield* settle
          assert.strictEqual((yield* container.phase)._tag, "ready")
          assert.deepStrictEqual(mounts, [4])
          assert.deepStrictEqual(
            [...backend.log].sort(),
            [
              "write package.json",
              "write src/main.ts",
              "write src/new.ts",
              "write src/util.ts",
            ],
            "one mount of the current Workspace, no replayed events",
          )
          assert.strictEqual(
            backend.files.get("src/main.ts"),
            "edited while failed",
          )

          yield* ws.writeFile("src/util.ts", "after retry")
          yield* awaitLog(backend, 5)
          assert.strictEqual(backend.files.get("src/util.ts"), "after retry")
        }),
      ),
    )
  })
})

describe("Container mirror onChange", () => {
  test("reports the mount, then each event after it lands, in order", async () => {
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
          const seen: Array<ContainerPhase["_tag"]> = []
          const fiber = yield* container.phaseChanges.pipe(
            Stream.take(2),
            Stream.runForEach((phase) =>
              Effect.sync(() => seen.push(phase._tag)),
            ),
            Effect.forkChild,
          )
          yield* settle
          assert.strictEqual((yield* container.phase)._tag, "booting")
          yield* Deferred.succeed(release, undefined)
          yield* Fiber.join(fiber)
          assert.deepStrictEqual(seen, ["booting", "ready"])
          yield* container.awaitReady
        }),
      undefined,
      Deferred.await(release),
    )
  })

  test("moves to failed and fails operations with the boot error", async () => {
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          const exit = yield* container.writeFile("a.ts", "").pipe(Effect.exit)
          const phase = yield* container.phase
          assert.strictEqual(phase._tag, "failed")
          assert.isTrue(Exit.isFailure(exit))
          if (Exit.isFailure(exit)) {
            assert.include(String(exit.cause), "ContainerBootFailed")
          }
        }),
      undefined,
      Effect.fail(new ContainerBootFailed({ message: "no" })),
    )
  })

  test("retry boots again after a failed boot, releasing the failed attempt first", async () => {
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
          const seen: Array<ContainerPhase["_tag"]> = []
          yield* container.phaseChanges.pipe(
            Stream.runForEach((phase) =>
              Effect.sync(() => seen.push(phase._tag)),
            ),
            Effect.forkScoped,
          )
          yield* settle
          assert.strictEqual((yield* container.phase)._tag, "failed")
          assert.deepStrictEqual(events, ["acquire 1", "release 1"])
          assert.isTrue(
            Exit.isFailure(yield* container.awaitReady.pipe(Effect.exit)),
          )

          yield* container.retry
          yield* container.awaitReady
          yield* container.writeFile("a.ts", "x")
          assert.strictEqual(backend.files.get("a.ts"), "x")
          yield* settle
          assert.deepStrictEqual(seen, ["failed", "booting", "ready"])
          assert.deepStrictEqual(events, [
            "acquire 1",
            "release 1",
            "acquire 2",
          ])
        }),
      ),
    )
    // The successful attempt lives until the Container's scope closes.
    assert.deepStrictEqual(events, [
      "acquire 1",
      "release 1",
      "acquire 2",
      "release 2",
    ])
  })

  test("retry does nothing while booting or ready", async () => {
    let attempts = 0
    const backend = makeFakeContainerBackend()
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          yield* container.awaitReady
          yield* container.retry
          yield* settle
          assert.strictEqual(attempts, 1)
          assert.strictEqual((yield* container.phase)._tag, "ready")
        }),
      backend,
      Effect.sync(() => {
        attempts++
      }),
    )

    // A retry while the retried boot is still running does not queue a
    // third attempt once that one fails.
    attempts = 0
    const second = Effect.runSync(Deferred.make<void, ContainerBootError>())
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          yield* settle
          yield* container.retry
          yield* settle
          assert.strictEqual((yield* container.phase)._tag, "booting")
          yield* container.retry
          yield* Deferred.fail(
            second,
            new ContainerBootFailed({ message: "2" }),
          )
          yield* settle
          assert.strictEqual(attempts, 2)
          assert.strictEqual((yield* container.phase)._tag, "failed")
        }),
      backend,
      Effect.suspend(() =>
        ++attempts === 1
          ? Effect.fail(new ContainerBootFailed({ message: "1" }))
          : Deferred.await(second),
      ),
    )
  })

  test("spawns through jsh with node_modules/.bin on PATH and returns output and exit code", async () => {
    const backend = makeFakeContainerBackend({
      spawn: () => ({ exitCode: 3, output: ["hello ", "world"] }),
    })
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          const proc = yield* container.spawn(jsh("echo hi", { cwd: "src" }))
          const output = yield* proc.output.pipe(Stream.mkString)
          assert.strictEqual(output, "hello world")
          assert.strictEqual(yield* proc.exitCode, 3)
          const call = backend.spawned[0]!
          assert.strictEqual(call.command, "jsh")
          assert.deepStrictEqual(call.args, ["-c", "echo hi"])
          assert.strictEqual(call.cwd, "src")
          assert.match(call.env.PATH!, /^node_modules\/\.bin:/)
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
          assert.strictEqual(backend.killed(), 0)
          yield* Fiber.interrupt(fiber)
          assert.strictEqual(backend.killed(), 1)
        }),
      backend,
    )
  })

  test("keeps host files outside the Workspace and names them for spawn arguments", async () => {
    const backend = makeFakeContainerBackend()
    await runContainer(
      (container) =>
        Effect.gen(function* () {
          yield* container.writeHostDirFile("collect.cjs", "script")
          assert.strictEqual(
            new TextDecoder().decode(
              yield* container.readHostDirFile("collect.cjs"),
            ),
            "script",
          )
          assert.isFalse(backend.files.has("collect.cjs"))
          assert.strictEqual(
            container.hostDirPath("collect.cjs"),
            "../.scratchpad/collect.cjs",
          )
          yield* container.removeHostDirFile("collect.cjs")
          yield* container.removeHostDirFile("missing")
          assert.strictEqual(backend.hostFiles.size, 0)
        }),
      backend,
    )
  })

  test("reads back files as text", async () => {
    await runContainer((container) =>
      Effect.gen(function* () {
        yield* container.mount({ "package.json": '{"name":"x"}' })
        assert.strictEqual(
          yield* container.readTextFile("package.json"),
          '{"name":"x"}',
        )
      }),
    )
  })
})
