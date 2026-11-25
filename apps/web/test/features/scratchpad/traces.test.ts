import * as Exit from "effect/Exit"
import * as Effect from "effect/Effect"
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
  recordDevToolsRequest,
} from "../../../src/features/devtools/traces.ts"
import { makeContainer } from "../../../src/features/scratchpad/container.ts"
import { followTraces } from "../../../src/features/scratchpad/traces.ts"
import { makeFakeContainerBackend } from "./fake-container.ts"

const line = (request: DevToolsSchema.Request) =>
  `${JSON.stringify(Schema.encodeSync(DevToolsRequest)(request))}\n`

const programSpan: DevToolsSchema.Span = {
  _tag: "Span",
  traceId: "trace-1",
  spanId: "span-1",
  name: "program",
  sampled: true,
  attributes: new Map([["source", "Playground"]]),
  status: {
    _tag: "Ended",
    startTime: 1_000n,
    endTime: 2_000n,
    exit: Exit.void,
  },
  parent: Option.none(),
}

/** Lets promises and forked fibers run. */
const settle = Effect.promise(
  () => new Promise<void>((resolve) => setTimeout(resolve, 20)),
)

/**
 * Follows traces from a fake Container whose proxy prints `output` and
 * stays up. Returns the store and a way to announce a Run.
 */
const follow = (output: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const backend = makeFakeContainerBackend({
      spawn: () => ({ output, hang: true }),
    })
    const container = yield* makeContainer(Effect.succeed(backend))
    const registry = AtomRegistry.make()
    const atoms = makeTraceAtoms({ keepAlive: true })
    const runIds = yield* Queue.unbounded<number | undefined>()
    yield* followTraces({
      container,
      registry,
      atoms,
      runIds: Stream.fromQueue(runIds),
    })
    yield* settle
    return {
      roots: () => registry.get(atoms.rootSpansAtom),
      /** As if the proxy printed `span` now. */
      receive: (span: DevToolsSchema.Span) =>
        recordDevToolsRequest(registry, atoms, span),
      startRun: (id: number) =>
        Queue.offer(runIds, id).pipe(Effect.andThen(settle)),
    }
  })

describe("Scratchpad traces", () => {
  test("the program's spans reach the store through the proxy, even when a line arrives in pieces", async () => {
    const ping = line({ _tag: "Ping" })
    const span = line(programSpan)
    const cut = Math.floor(span.length / 2)
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { roots } = yield* follow([
            ping + span.slice(0, cut),
            span.slice(cut),
          ])
          assert.deepStrictEqual(
            roots().map((root) => root.label),
            ["program"],
          )
        }),
      ),
    )
  })

  test("the previous Run's spans stay until the new Run's first span replaces them", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { roots, receive, startRun } = yield* follow([
            line(programSpan),
          ])
          const shown = () => roots().map((root) => root.label)
          const seen = [shown()]
          yield* startRun(1)
          seen.push(shown())
          receive({ ...programSpan, traceId: "trace-2", name: "next" })
          seen.push(shown())
          assert.deepStrictEqual(seen, [["program"], ["program"], ["next"]])
        }),
      ),
    )
  })
})
