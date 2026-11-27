import * as Clock from "effect/Clock"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import * as Queue from "effect/Queue"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Stream from "effect/Stream"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  makeScratchpadSession,
  RECOVERED_NOTICE_MS,
} from "../../../src/features/scratchpad/session.ts"
import {
  LspTransport,
  TransportFatalError,
  type TransportEvent,
} from "../../../src/features/scratchpad/transport.ts"
import type { WorkerAssets } from "../../../src/features/scratchpad/worker-protocol.ts"
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

/** Runs `body` against `layerWorker` over fake workers, in a scope that closes after it. */
const withLayer = <A>(
  body: (ctx: {
    readonly lsp: LspTransport["Service"]
    readonly mirror: LspWorkspaceMirror["Service"]
    readonly workers: ReadonlyArray<FakeWorker>
  }) => Effect.Effect<A, never, Scope.Scope>,
) => {
  const fakes = makeFakeWorkers()
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const lsp = yield* LspTransport
        const mirror = yield* LspWorkspaceMirror
        return yield* body({ lsp, mirror, workers: fakes.workers })
      }).pipe(
        Effect.provide(
          layerWorker({ makeWorker: fakes.makeWorker, assets: ASSETS }),
        ),
      ),
    ),
  ).then((result) => ({ result, workers: fakes.workers }))
}

const fsOps = (worker: FakeWorker) =>
  worker.controls().flatMap((m) => (m._tag === "Fs" ? [m.op] : []))

describe("layerWorker", () => {
  test("a new worker gets the Workspace files before it starts", async () => {
    await withLayer(({ lsp, mirror, workers }) =>
      Effect.gen(function* () {
        mirror.apply({ _tag: "Reset", files: { "src/main.ts": "main" } })
        yield* lsp.reconnect
        assert.deepEqual(workers[0]!.controls(), [
          {
            _tag: "Fs",
            op: { _tag: "Reset", files: { "src/main.ts": "main" } },
          },
          { _tag: "Start", assets: ASSETS },
        ])
      }),
    )
  })

  test("Workspace changes reach the running worker", async () => {
    await withLayer(({ lsp, mirror, workers }) =>
      Effect.gen(function* () {
        yield* lsp.reconnect
        mirror.apply({ _tag: "WriteFile", path: "src/a.ts", content: "a" })
        assert.deepEqual(fsOps(workers[0]!).at(-1), {
          _tag: "WriteFile",
          path: "src/a.ts",
          content: "a",
        })
      }),
    )
  })

  test("JSON-RPC flows both ways only once the worker is Ready", async () => {
    await withLayer(({ lsp, workers }) =>
      Effect.gen(function* () {
        const received: Array<string> = []
        lsp.transport.subscribe((m) => received.push(m))
        yield* lsp.reconnect
        const worker = workers[0]!
        lsp.transport.send("early request")
        worker.emit("early response")
        worker.emit({ _tag: "Ready" })
        lsp.transport.send("request")
        worker.emit("response")
        assert.deepEqual(
          { sent: worker.strings(), received },
          { sent: ["request"], received: ["response"] },
        )
      }),
    )
  })

  test("a worker that fails for good disconnects with a TransportFatalError", async () => {
    await withLayer(({ lsp, workers }) =>
      Effect.gen(function* () {
        const events = yield* Queue.unbounded<TransportEvent>()
        yield* lsp.events.pipe(
          Stream.runForEach((ev) => Queue.offer(events, ev)),
          Effect.forkScoped,
        )
        yield* Effect.yieldNow
        yield* lsp.reconnect
        workers[0]!.emit({ _tag: "Fatal", message: "wasm 404" })
        const event = yield* Queue.take(events)
        assert.deepEqual(event, {
          _tag: "Disconnected",
          error: new TransportFatalError({ message: "wasm 404" }),
        })
      }),
    )
  })

  test("a restarted worker starts from the current Workspace files and the newest types pack", async () => {
    await withLayer(({ lsp, mirror, workers }) =>
      Effect.gen(function* () {
        yield* lsp.reconnect
        mirror.apply({
          _tag: "Reset",
          files: { "src/a.ts": "a", "src/lib/b.ts": "b", "c.ts": "c" },
        })
        mirror.apply({ _tag: "Rename", from: "src", to: "app" })
        mirror.apply({ _tag: "Remove", path: "c.ts" })
        mirror.apply({ _tag: "WriteFile", path: "d.ts", content: "d" })
        yield* mirror.mountTypes(new Uint8Array([1])).pipe(Effect.forkScoped)
        yield* mirror.mountTypes(new Uint8Array([9])).pipe(Effect.forkScoped)
        yield* Effect.yieldNow
        workers[0]!.emit({ _tag: "Fatal", message: "boom" })
        yield* lsp.reconnect
        const [reset, types] = fsOps(workers[1]!)
        assert.deepEqual(
          {
            reset,
            types:
              types?._tag === "ReplaceNodeModules"
                ? [...new Uint8Array(types.pack)]
                : types,
          },
          {
            reset: {
              _tag: "Reset",
              files: { "app/a.ts": "a", "app/lib/b.ts": "b", "d.ts": "d" },
            },
            types: [9],
          },
        )
      }),
    )
  })

  test("mountTypes resolves with the worker's answer", async () => {
    await withLayer(({ lsp, mirror, workers }) =>
      Effect.gen(function* () {
        yield* lsp.reconnect
        const mount = yield* mirror
          .mountTypes(new Uint8Array([1]))
          .pipe(Effect.forkChild)
        yield* Effect.yieldNow
        const op = fsOps(workers[0]!).at(-1)
        const id = op?._tag === "ReplaceNodeModules" ? op.id : -1
        workers[0]!.emit({ _tag: "TypesRejected", id, message: "bad magic" })
        assert.deepEqual(yield* Fiber.join(mount), {
          _tag: "TypesRejected",
          id,
          message: "bad magic",
        })
      }),
    )
  })

  test("readFile answers with the content the worker reads", async () => {
    await withLayer(({ lsp, mirror, workers }) =>
      Effect.gen(function* () {
        yield* lsp.reconnect
        const read = yield* mirror
          .readFile("node_modules/effect/package.json")
          .pipe(Effect.forkChild)
        yield* Effect.yieldNow
        const request = workers[0]!
          .controls()
          .find((m) => m._tag === "ReadFile")
        workers[0]!.emit({
          _tag: "FileRead",
          id: request?._tag === "ReadFile" ? request.id : -1,
          content: "{}",
        })
        assert.deepEqual(yield* Fiber.join(read), Option.some("{}"))
      }),
    )
  })

  test("readFile answers None when the worker goes away before answering", async () => {
    await withLayer(({ lsp, mirror, workers }) =>
      Effect.gen(function* () {
        yield* lsp.reconnect
        const read = yield* mirror
          .readFile("node_modules/effect/package.json")
          .pipe(Effect.forkChild)
        yield* Effect.yieldNow
        workers[0]!.emit({ _tag: "Fatal", message: "boom" })
        assert.isTrue(Option.isNone(yield* Fiber.join(read)))
      }),
    )
  })

  test("closing the scope terminates the worker", async () => {
    const { workers } = await withLayer(({ lsp }) => lsp.reconnect)
    assert.isTrue(workers[0]!.terminated)
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
    const unsubscribe = registry.subscribe(session.statusAtom, () => {}, {
      immediate: true,
    })
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

  test("the status shows the worker's loading progress", async () => {
    const ctx = await setup()
    try {
      ctx.fakes.workers[0]!.emit({
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
    } finally {
      ctx.dispose()
    }
  })

  test("the status is ready once the worker is Ready and the server initializes", async () => {
    const ctx = await setup()
    try {
      const worker = ctx.fakes.workers[0]!
      worker.emit({ _tag: "Ready" })
      await ctx.answerInitialize(worker)
      assert.deepEqual(ctx.status(), { _tag: "ready" })
    } finally {
      ctx.dispose()
    }
  })

  test("a crash recovery inside the worker shows briefly, then the status settles back to ready", async () => {
    const ctx = await setup()
    try {
      const worker = ctx.fakes.workers[0]!
      worker.emit({ _tag: "Ready" })
      await ctx.answerInitialize(worker)
      worker.emit({
        _tag: "Recovered",
        recovery: {
          reason: "RangeError: Maximum call stack size exceeded",
          method: "textDocument/didChange",
          uri: "file:///workspace/src/main.ts",
          ms: 412,
          quarantined: ["file:///workspace/src/main.ts"],
        },
      })
      await flush()
      const shown = ctx.status()._tag
      await ctx.adjust(RECOVERED_NOTICE_MS)
      assert.deepEqual([shown, ctx.status()._tag], ["recovered", "ready"])
    } finally {
      ctx.dispose()
    }
  })
})
