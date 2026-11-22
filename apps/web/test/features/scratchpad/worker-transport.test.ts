import * as Clock from "effect/Clock"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
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
import type { WorkerAssets } from "../../../src/features/scratchpad/worker-protocol.ts"
import {
  applyFsOpToFiles,
  layerWorker,
  LspWorkspaceMirror,
  workspaceEventToFsOp,
} from "../../../src/features/scratchpad/worker-transport.ts"
import { makeFakeWorkers, type FakeWorker } from "./fake-worker.ts"

const ASSETS: WorkerAssets = {
  wasm: { url: "/assets/lsp.wasm", bytes: 100 },
  typesPacks: [{ url: "/assets/effect.pack.gz", bytes: 50 }],
}

const flush = async (ticks = 20) => {
  for (let i = 0; i < ticks; i++) await Promise.resolve()
}

describe("layerWorker", () => {
  test("starts a worker with the Workspace files, relays progress, connects on Ready and exchanges JSON-RPC strings", async () => {
    const fakes = makeFakeWorkers()
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const mirror = yield* LspWorkspaceMirror
          const events = yield* Queue.unbounded<TransportEvent>()
          const received: Array<string> = []
          lsp.transport.subscribe((m) => received.push(m))
          yield* lsp.events.pipe(
            Stream.runForEach((ev) => Queue.offer(events, ev)),
            Effect.forkScoped,
          )
          yield* Effect.yieldNow

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
            _tag: "Progress",
            phase: "downloading",
            loadedBytes: 40,
            totalBytes: 150,
          })
          assert.deepEqual(yield* Queue.take(events), {
            _tag: "Loading",
            phase: "downloading",
            loadedBytes: 40,
            totalBytes: 150,
          })

          worker.emit({
            _tag: "Ready",
            timings: { loadMs: 1, startMs: 2 },
            memoryBytes: 3,
          })
          const connected = yield* Queue.take(events)
          assert.equal(connected._tag, "Connected")

          lsp.transport.send('{"jsonrpc":"2.0","id":1,"method":"initialize"}')
          assert.deepEqual(worker.strings(), [
            '{"jsonrpc":"2.0","id":1,"method":"initialize"}',
          ])
          worker.emit('{"jsonrpc":"2.0","id":1,"result":{}}')
          assert.deepEqual(received, ['{"jsonrpc":"2.0","id":1,"result":{}}'])

          worker.emit({
            _tag: "Recovered",
            recovery: {
              reason: "RangeError: Maximum call stack size exceeded",
              method: "textDocument/diagnostic",
              uri: "file:///workspace/src/deep.ts",
              ms: 400,
              quarantined: ["file:///workspace/src/deep.ts"],
            },
          })
          const recovered = yield* Queue.take(events)
          assert.equal(recovered._tag, "Recovered")
          assert.isFalse(worker.terminated)
        }).pipe(
          Effect.provide(
            layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
          ),
        ),
      ),
    )
    // Closing the scope terminates the worker.
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
          mirror.apply({ _tag: "Reset", files: { "a.ts": "a" } })
          mirror.apply({ _tag: "Rename", from: "a.ts", to: "b.ts" })
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
            op: { _tag: "Reset", files: { "b.ts": "a" } },
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

  test("maps Workspace events to file system ops and applies them to a file map", () => {
    assert.deepEqual(
      workspaceEventToFsOp({ _tag: "FileCreated", path: "a.ts", content: "x" }),
      { _tag: "WriteFile", path: "a.ts", content: "x" },
    )
    assert.deepEqual(
      workspaceEventToFsOp({ _tag: "FileChanged", path: "a.ts", content: "y" }),
      { _tag: "WriteFile", path: "a.ts", content: "y" },
    )
    assert.deepEqual(
      workspaceEventToFsOp({ _tag: "FileDeleted", path: "a.ts" }),
      {
        _tag: "Remove",
        path: "a.ts",
      },
    )
    assert.deepEqual(
      workspaceEventToFsOp({
        _tag: "FileRenamed",
        oldPath: "a.ts",
        newPath: "b.ts",
        content: "y",
      }),
      { _tag: "Rename", from: "a.ts", to: "b.ts" },
    )
    assert.isUndefined(workspaceEventToFsOp({ _tag: "DirectoryChanged" }))

    const files = new Map<string, string>()
    applyFsOpToFiles(files, {
      _tag: "Reset",
      files: { "src/a.ts": "a", "src/lib/b.ts": "b", "c.ts": "c" },
    })
    applyFsOpToFiles(files, { _tag: "Rename", from: "src", to: "app" })
    applyFsOpToFiles(files, { _tag: "Remove", path: "c.ts" })
    assert.deepEqual(Object.fromEntries(files), {
      "app/a.ts": "a",
      "app/lib/b.ts": "b",
    })
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
      reconnect: () => registry.set(session.reconnectAtom, undefined),
      online: () => registry.set(session.onlineAtom, undefined),
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
        timings: { loadMs: 1, startMs: 2 },
        memoryBytes: 3,
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

      // No WebSocket semantics leak in: never reconnecting or idle.
      assert.isFalse(
        ctx.history.some((s) => s._tag === "reconnecting" || s._tag === "idle"),
      )
    } finally {
      ctx.dispose()
    }
  })

  test("a fatal error shows a retryable crashed error without backoff; online does not restart it; a click does", async () => {
    const ctx = await setup()
    try {
      ctx.fakes.workers[0]!.emit({
        _tag: "Fatal",
        message: "Fetching /assets/lsp.wasm failed with 404",
      })
      await flush()
      assert.deepEqual(ctx.status(), {
        _tag: "error",
        code: "crashed",
        message: "Fetching /assets/lsp.wasm failed with 404",
        retryable: true,
      })
      await ctx.adjust("60 seconds")
      ctx.online()
      await flush()
      assert.equal(ctx.fakes.workers.length, 1)
      assert.equal(ctx.status()._tag, "error")

      ctx.reconnect()
      await flush()
      assert.equal(ctx.fakes.workers.length, 2)
      assert.deepEqual(ctx.status(), { _tag: "connecting" })
      const worker = ctx.fakes.workers[1]!
      worker.emit({
        _tag: "Ready",
        timings: { loadMs: 1, startMs: 2 },
        memoryBytes: 3,
      })
      await ctx.answerInitialize(worker)
      assert.deepEqual(ctx.status(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })
})
