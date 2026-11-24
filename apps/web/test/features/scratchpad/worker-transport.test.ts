import * as Clock from "effect/Clock"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Stream from "effect/Stream"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  makeScratchpadSession,
  RECOVERED_NOTICE_MS,
  type LspStatus,
} from "../../../src/features/scratchpad/session.ts"
import {
  LspTransport,
  TransportFatalError,
  type TransportEvent,
} from "../../../src/features/scratchpad/transport.ts"
import type {
  PageToWorker,
  WorkerAssets,
} from "../../../src/features/scratchpad/worker-protocol.ts"
import {
  layerWorker,
  LspWorkspaceMirror,
} from "../../../src/features/scratchpad/worker-transport.ts"
import { makeFakeWorkers, type FakeWorker } from "./fake-worker.ts"

const ASSETS: WorkerAssets = {
  wasm: { url: "/assets/lsp.wasm", bytes: 100 },
}

const flush = async (ticks = 20) => {
  for (let i = 0; i < ticks; i++) await Promise.resolve()
}

describe("layerWorker", () => {
  test("starts a worker with the Workspace files, holds JSON-RPC until Ready, forwards Workspace changes, and disposes the worker with the scope", async () => {
    const fakes = makeFakeWorkers()
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const mirror = yield* LspWorkspaceMirror
          const received: Array<string> = []
          lsp.transport.subscribe((m) => received.push(m))

          mirror.apply({
            _tag: "Reset",
            files: { "src/main.ts": "main" },
          })
          yield* lsp.reconnect
          const worker = fakes.workers[0]!
          assert.deepEqual(worker.controls(), [
            {
              _tag: "Fs",
              op: { _tag: "Reset", files: { "src/main.ts": "main" } },
            },
            { _tag: "Start", assets: ASSETS },
          ])

          // Before Ready, JSON-RPC is neither sent nor delivered.
          lsp.transport.send('{"jsonrpc":"2.0","id":0,"method":"early"}')
          worker.emit('{"jsonrpc":"2.0","id":0,"result":null}')
          assert.deepEqual(worker.strings(), [])
          assert.deepEqual(received, [])

          // Workspace changes go to the worker while it loads.
          mirror.apply({
            _tag: "WriteFile",
            path: "src/greeter.ts",
            content: "greeter",
          })
          assert.deepEqual(worker.controls().at(-1), {
            _tag: "Fs",
            op: {
              _tag: "WriteFile",
              path: "src/greeter.ts",
              content: "greeter",
            },
          })

          worker.emit({
            _tag: "Ready",
          })
          lsp.transport.send('{"jsonrpc":"2.0","id":1,"method":"initialize"}')
          assert.deepEqual(worker.strings(), [
            '{"jsonrpc":"2.0","id":1,"method":"initialize"}',
          ])
          worker.emit('{"jsonrpc":"2.0","id":1,"result":{}}')
          assert.deepEqual(received, ['{"jsonrpc":"2.0","id":1,"result":{}}'])
          assert.isFalse(worker.terminated)
        }).pipe(
          Effect.provide(
            layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
          ),
        ),
      ),
    )
    // Closing the scope disposes and terminates the worker.
    assert.isTrue(fakes.workers[0]!.terminated)
    assert.deepEqual(fakes.workers[0]!.controls().at(-1), { _tag: "Dispose" })
  })

  test("a fatal worker becomes Disconnected with TransportFatalError; reconnect starts a fresh worker with the current files", async () => {
    const fakes = makeFakeWorkers()
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const mirror = yield* LspWorkspaceMirror
          const events = yield* Queue.unbounded<TransportEvent>()
          yield* lsp.events.pipe(
            Stream.runForEach((ev) => Queue.offer(events, ev)),
            Effect.forkScoped,
          )
          yield* Effect.yieldNow

          yield* lsp.reconnect
          mirror.apply({
            _tag: "Reset",
            files: { "src/a.ts": "a", "src/lib/b.ts": "b", "c.ts": "c" },
          })
          mirror.apply({ _tag: "Rename", from: "src", to: "app" })
          mirror.apply({ _tag: "Remove", path: "c.ts" })
          mirror.apply({ _tag: "WriteFile", path: "d.ts", content: "d" })
          fakes.workers[0]!.emit({
            _tag: "Fatal",
            message: "Fetching /assets/lsp.wasm failed with 404",
          })
          const failed = yield* Queue.take(events)
          assert.equal(failed._tag, "Disconnected")
          if (failed._tag === "Disconnected") {
            assert.instanceOf(failed.error, TransportFatalError)
            assert.match(failed.error.message, /404/)
          }
          assert.isTrue(fakes.workers[0]!.terminated)

          yield* lsp.reconnect
          assert.equal(fakes.workers.length, 2)
          assert.deepEqual(fakes.workers[1]!.controls()[0], {
            _tag: "Fs",
            op: {
              _tag: "Reset",
              files: { "app/a.ts": "a", "app/lib/b.ts": "b", "d.ts": "d" },
            },
          })

          // A script error (e.g. the worker chunk failed to load) is fatal too.
          fakes.workers[1]!.crash("Script error")
          const crashed = yield* Queue.take(events)
          assert.equal(
            crashed._tag === "Disconnected" && crashed.error._tag,
            "TransportFatalError",
          )
        }).pipe(
          Effect.provide(
            layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
          ),
        ),
      ),
    )
  })

  test("mountTypes transfers a copy of the pack, resolves with the worker's answer, and replays the pack to every new worker", async () => {
    const fakes = makeFakeWorkers()
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const mirror = yield* LspWorkspaceMirror
          const pack = new Uint8Array([1, 2, 3])
          const opOf = (message: PageToWorker | string | undefined) =>
            typeof message === "object" && message._tag === "Fs"
              ? message.op
              : undefined

          // Before any worker exists the pack is only kept.
          const first = yield* mirror.mountTypes(pack).pipe(Effect.forkChild)
          yield* Effect.yieldNow
          yield* lsp.reconnect
          const worker = fakes.workers[0]!
          assert.deepEqual(
            worker
              .controls()
              .map((m) => (m._tag === "Fs" ? m.op._tag : m._tag)),
            ["Reset", "ReplaceNodeModules", "Start"],
          )
          const replace = opOf(worker.posted[1])
          assert.equal(replace?._tag, "ReplaceNodeModules")
          if (replace?._tag !== "ReplaceNodeModules") return
          assert.equal(replace.id, 1)
          assert.deepEqual([...new Uint8Array(replace.pack)], [1, 2, 3])
          assert.deepEqual(worker.transfers[1], [replace.pack])
          assert.equal(pack.byteLength, 3, "the page keeps its own copy")

          worker.emit({
            _tag: "TypesMounted",
            id: 1,
            files: 1,
            bytes: 3,
            packages: [{ name: "effect", version: "4.1.5" }],
          })
          const answer = yield* Fiber.join(first)
          assert.equal(answer._tag, "TypesMounted")

          // A newer pack goes straight to the running worker.
          const second = yield* mirror
            .mountTypes(new Uint8Array([9]))
            .pipe(Effect.forkChild)
          yield* Effect.yieldNow
          const newer = opOf(worker.posted.at(-1))
          assert.equal(newer?._tag === "ReplaceNodeModules" && newer.id, 2)
          worker.emit({ _tag: "TypesRejected", id: 2, message: "bad magic" })
          assert.deepEqual(yield* Fiber.join(second), {
            _tag: "TypesRejected",
            id: 2,
            message: "bad magic",
          })

          // A restarted worker gets the newest pack after the files.
          worker.emit({ _tag: "Fatal", message: "boom" })
          yield* lsp.reconnect
          const replayed = opOf(fakes.workers[1]!.posted[1])
          assert.equal(replayed?._tag, "ReplaceNodeModules")
          if (replayed?._tag === "ReplaceNodeModules") {
            assert.equal(replayed.id, 2)
            assert.deepEqual([...new Uint8Array(replayed.pack)], [9])
          }
        }).pipe(
          Effect.provide(
            layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
          ),
        ),
      ),
    )
  })
  test("readFile asks the running worker by id and answers None when the worker has no file, goes away, or does not exist", async () => {
    const fakes = makeFakeWorkers()
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const mirror = yield* LspWorkspaceMirror

          assert.isTrue(
            Option.isNone(yield* mirror.readFile("node_modules/a.d.ts")),
          )

          yield* lsp.reconnect
          const worker = fakes.workers[0]!
          const readsOf = (target: FakeWorker) =>
            target.controls().flatMap((m) => (m._tag === "ReadFile" ? [m] : []))

          const found = yield* mirror
            .readFile("node_modules/effect/dist/Effect.d.ts")
            .pipe(Effect.forkChild)
          const missing = yield* mirror
            .readFile("node_modules/nope.d.ts")
            .pipe(Effect.forkChild)
          yield* Effect.yieldNow
          const [first, second] = readsOf(worker)
          assert.equal(first?.path, "node_modules/effect/dist/Effect.d.ts")
          assert.equal(second?.path, "node_modules/nope.d.ts")
          // Answers are matched by id, not by order.
          worker.emit({ _tag: "FileRead", id: second!.id, content: null })
          worker.emit({
            _tag: "FileRead",
            id: first!.id,
            content: "export declare const Effect: unique symbol",
          })
          assert.deepEqual(
            yield* Fiber.join(found),
            Option.some("export declare const Effect: unique symbol"),
          )
          assert.isTrue(Option.isNone(yield* Fiber.join(missing)))

          const pending = yield* mirror
            .readFile("node_modules/effect/package.json")
            .pipe(Effect.forkChild)
          yield* Effect.yieldNow
          worker.emit({ _tag: "Fatal", message: "boom" })
          assert.isTrue(Option.isNone(yield* Fiber.join(pending)))
        }).pipe(
          Effect.provide(
            layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
          ),
        ),
      ),
    )
  })
})

describe("ScratchpadSession over layerWorker", () => {
  const setup = async () => {
    const fakes = makeFakeWorkers()
    const session = makeScratchpadSession({
      transportLayer: Layer.merge(
        layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
        TestClock.layer(),
      ),
      rootUri: "file:///workspace",
    })
    const clockAtom = session.runtime.atom(Clock.Clock)
    const registry = AtomRegistry.make()
    const history: Array<LspStatus> = []
    const unsubscribe = registry.subscribe(
      session.statusAtom,
      (s) => history.push(s),
      { immediate: true },
    )
    const unmountClient = registry.mount(session.clientAtom)
    const unmountClock = registry.mount(clockAtom)
    await flush()
    const adjust = async (duration: Duration.Input) => {
      const clock = registry.get(clockAtom)
      if (clock._tag !== "Success") throw new Error("no TestClock")
      await Effect.runPromise(
        (clock.value as TestClock.TestClock).adjust(duration),
      )
      await flush()
    }
    // Answer `initialize` like the worker's server would.
    const answerInitialize = async (worker: FakeWorker) => {
      await flush()
      const init = worker
        .strings()
        .map((m) => JSON.parse(m) as { id?: number; method?: string })
        .find((m) => m.method === "initialize")
      assert.isDefined(init)
      worker.emit(
        JSON.stringify({
          jsonrpc: "2.0",
          id: init!.id,
          result: { capabilities: { textDocumentSync: 2 } },
        }),
      )
      await flush()
    }
    return {
      fakes,
      registry,
      history,
      adjust,
      answerInitialize,
      status: () => registry.get(session.statusAtom),
      dispose: () => {
        unsubscribe()
        unmountClock()
        unmountClient()
        registry.dispose()
      },
    }
  }

  test("goes connecting, loading (with progress), ready; a recovery shows briefly and settles back to ready", async () => {
    const ctx = await setup()
    try {
      const worker = ctx.fakes.workers[0]!
      assert.deepEqual(ctx.status(), { _tag: "connecting" })

      worker.emit({
        _tag: "Progress",
        phase: "downloading",
        loadedBytes: 75,
        totalBytes: 150,
      })
      await flush()
      assert.deepEqual(ctx.status(), {
        _tag: "loading",
        phase: "downloading",
        loadedBytes: 75,
        totalBytes: 150,
      })
      worker.emit({
        _tag: "Progress",
        phase: "starting",
        loadedBytes: 150,
        totalBytes: 150,
      })
      worker.emit({
        _tag: "Ready",
      })
      await ctx.answerInitialize(worker)
      assert.deepEqual(ctx.status(), { _tag: "ready" })

      const recovery = {
        reason: "RangeError: Maximum call stack size exceeded",
        method: "textDocument/didChange",
        uri: "file:///workspace/src/main.ts",
        ms: 412,
        quarantined: ["file:///workspace/src/main.ts"],
      }
      worker.emit({ _tag: "Recovered", recovery })
      await flush()
      assert.deepEqual(ctx.status(), { _tag: "recovered", recovery })
      // The worker keeps running: no new worker, no reconnect.
      assert.equal(ctx.fakes.workers.length, 1)
      assert.isFalse(worker.terminated)

      await ctx.adjust(RECOVERED_NOTICE_MS - 1)
      assert.equal(ctx.status()._tag, "recovered")
      await ctx.adjust(1)
      assert.deepEqual(ctx.status(), { _tag: "ready" })

      // A recovery never goes through backoff.
      assert.isFalse(ctx.history.some((s) => s._tag === "reconnecting"))
    } finally {
      ctx.dispose()
    }
  })
})
