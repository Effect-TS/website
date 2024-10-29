import * as DevToolsDomain from "@effect/experimental/DevTools/Domain"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { Span } from "../domain/devtools"
import { WebContainer } from "./webcontainer"

export class DevTools extends Effect.Service<DevTools>()("app/DevTools", {
  dependencies: [WebContainer.Default],
  scoped: Effect.gen(function*() {
    const container = yield* WebContainer

    const rootSpans = yield* SubscriptionRef.make<ReadonlyArray<Span>>([])

    function registerSpan(span: DevToolsDomain.ParentSpan) {
      return SubscriptionRef.update(rootSpans, (rootSpans) =>
        pipe(
          rootSpans,
          Array.findFirstIndex((root) => root.traceId === span.traceId),
          Option.flatMap((index) =>
            Array.modifyOption(rootSpans, index, (root) => root.addSpan(span))
          ),
          Option.getOrElse(() => Array.prepend(rootSpans, Span.fromSpan(span)))
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

    yield* container.devTools.pipe(
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
}) { }

