import {
  Array,
  Effect,
  Layer,
  Option,
  Stream,
  SubscriptionRef,
  pipe
} from "effect"
import * as DevToolsDomain from "@effect/experimental/DevTools/Domain"
import { Span } from "../domain/devtools"
import { WebContainer } from "./WebContainer"

const make = Effect.gen(function* () {
  const { devTools } = yield* WebContainer

  const rootSpans = yield* SubscriptionRef.make<ReadonlyArray<Span>>([])

  function registerSpan(span: DevToolsDomain.ParentSpan) {
    return SubscriptionRef.update(rootSpans, (rootSpans) =>
      pipe(
        rootSpans,
        Array.findFirstIndex((root) => root.traceId === span.traceId),
        Option.flatMap((index) =>
          Array.modifyOption(rootSpans, index, (root) => root.addSpan(span))
        ),
        Option.getOrElse(() => Array.append(rootSpans, Span.fromSpan(span)))
      )
    )
  }

  function registerSpanEvent(event: DevToolsDomain.SpanEvent) {
    return SubscriptionRef.updateSome(rootSpans, (rootSpans) =>
      pipe(
        rootSpans,
        Array.findFirstIndex((root) => root.traceId === event.traceId),
        Option.flatMap((index) =>
          Array.modifyOption(rootSpans, index, (root) => root.addEvent(event))
        )
      )
    )
  }

  yield* devTools.pipe(
    Stream.runForEach((request) => {
      switch (request._tag) {
        case "MetricsSnapshot": {
          return Effect.void
        }
        case "Span": {
          return registerSpan(request)
        }
        case "SpanEvent": {
          return registerSpanEvent(request)
        }
      }
    }),
    Effect.forkScoped
  )

  return {
    rootSpans
  } as const
})

export class TraceProvider extends Effect.Tag("TraceProvider")<
  TraceProvider,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make).pipe(
    Layer.provide(WebContainer.Live)
  )
}
