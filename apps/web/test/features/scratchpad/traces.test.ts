import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type * as DevToolsSchema from "effect/devtools/DevToolsSchema"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { assert, describe, test } from "vite-plus/test"
import {
  DevToolsRequest,
  makeTraceAtoms,
} from "../../../src/features/devtools/traces.ts"
import { makeContainer } from "../../../src/features/scratchpad/container.ts"
import {
  devToolsRequests,
  followTraces,
} from "../../../src/features/scratchpad/traces.ts"
import { makeFakeContainerBackend } from "./fake-container.ts"

const line = (request: DevToolsSchema.Request) =>
  `${JSON.stringify(Schema.encodeSync(DevToolsRequest)(request))}\n`

const span = (
  traceId: string,
  name: string,
  ended = true,
): DevToolsSchema.Span => ({
  _tag: "Span",
  traceId,
  spanId: `${traceId}-root`,
  name,
  sampled: true,
  attributes: new Map(),
  status: ended
    ? { _tag: "Ended", startTime: 1_000n, endTime: 2_000n, exit: Exit.void }
    : { _tag: "Started", startTime: 1_000n },
  parent: Option.none(),
})

/** Lets forked fibers and short timers run. */
const wait = (ms: number) =>
  Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))

/**
 * Follows traces from a stream of requests, holding a new Run's traces for
 * 50ms at most. Returns the shown trace names, and ways to receive a span
 * and to start a Run.
 */
const follow = Effect.gen(function* () {
  const registry = AtomRegistry.make()
  const atoms = makeTraceAtoms({ keepAlive: true })
  const requests = yield* Queue.unbounded<DevToolsSchema.Span>()
  const runIds = yield* Queue.unbounded<number | undefined>()
  yield* followTraces({
    requests: Stream.fromQueue(requests),
    runIds: Stream.fromQueue(runIds),
    registry,
    atoms,
    holdFor: "50 millis",
  })
  return {
    shown: () => registry.get(atoms.rootSpansAtom).map((root) => root.label),
    receive: (request: DevToolsSchema.Span) =>
      Queue.offer(requests, request).pipe(Effect.andThen(wait(5))),
    startRun: (id: number) =>
      Queue.offer(runIds, id).pipe(Effect.andThen(wait(5))),
  }
})

describe("Scratchpad traces", () => {
  test("the proxy's output decodes to the program's spans, even when a line arrives in pieces", async () => {
    const whole = line(span("trace-1", "program"))
    const cut = Math.floor(whole.length / 2)
    const backend = makeFakeContainerBackend({
      spawn: () => ({
        output: [
          line({ _tag: "Ping" }) + whole.slice(0, cut),
          whole.slice(cut),
        ],
        hang: true,
      }),
    })
    const received = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const container = yield* makeContainer(Effect.succeed(backend))
          return yield* devToolsRequests(container).pipe(
            Stream.take(1),
            Stream.runCollect,
          )
        }),
      ),
    )
    assert.deepStrictEqual(
      received.map((request) =>
        request._tag === "Span" ? request.name : request._tag,
      ),
      ["program"],
    )
  })

  test("a new Run's traces replace the previous Run's once its first trace ends", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { shown, receive, startRun } = yield* follow
          yield* receive(span("trace-1", "previous"))
          yield* startRun(1)
          yield* receive(span("trace-2", "next", false))
          const whileRunning = shown()
          yield* receive(span("trace-2", "next"))
          assert.deepStrictEqual(
            [whileRunning, shown()],
            [["previous"], ["next"]],
          )
        }),
      ),
    )
  })

  test("a new Run's long-running first trace is shown live once the hold time passes", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { shown, receive, startRun } = yield* follow
          yield* receive(span("trace-1", "previous"))
          yield* startRun(1)
          yield* receive(span("trace-2", "slow", false))
          yield* wait(100)
          assert.deepStrictEqual(shown(), ["slow"])
        }),
      ),
    )
  })
})
