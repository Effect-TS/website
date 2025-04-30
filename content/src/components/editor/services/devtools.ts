import * as DevToolsDomain from "@effect/experimental/DevTools/Domain"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import { Span } from "../domain/devtools"
import { WebContainer } from "./webcontainer"
import { Rx } from "@effect-rx/rx-react"

export const rootSpansRx = Rx.make<ReadonlyArray<Span>>([])

export const DevToolsLayer = Layer.scopedDiscard(
  Effect.gen(function* () {
    const container = yield* WebContainer

    function registerSpan(span: DevToolsDomain.ParentSpan) {
      return Rx.update(rootSpansRx, (rootSpans) =>
        pipe(
          rootSpans,
          Array.findFirstIndex((root) => root.traceId === span.traceId),
          Option.flatMap((index) => Array.modifyOption(rootSpans, index, (root) => root.addSpan(span))),
          Option.getOrElse(() => Array.prepend(rootSpans, Span.fromSpan(span)))
        )
      )
    }

    function registerSpanEvent(event: DevToolsDomain.SpanEvent) {
      return Rx.update(rootSpansRx, (rootSpans) =>
        pipe(
          rootSpans,
          Array.findFirstIndex((root) => root.traceId === event.traceId),
          Option.flatMap((index) => Array.modifyOption(rootSpans, index, (root) => root.addEvent(event))),
          Option.getOrElse(() => rootSpans)
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
  })
).pipe(Layer.provide(WebContainer.Default))
