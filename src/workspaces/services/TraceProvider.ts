import {
  Array,
  Duration,
  Effect,
  Layer,
  Option,
  Stream,
  SubscriptionRef
} from "effect"
import * as DevToolsDomain from "@effect/experimental/DevTools/Domain"
import { RxRef } from "@effect-rx/rx-react"
import { WebContainer } from "./WebContainer"

const make = Effect.gen(function* () {
  const { devTools } = yield* WebContainer

  const cache = new Map<string, SpanNode>()
  const traces = yield* SubscriptionRef.make(Array.empty<SpanNode>())

  function registerSpan(
    span: DevToolsDomain.ParentSpan
  ): Effect.Effect<SpanNode> {
    return Effect.gen(function* () {
      let node = cache.get(span.spanId)

      const isUpgrade =
        span._tag === "Span" && node?.span._tag === "ExternalSpan"

      if (node === undefined || isUpgrade) {
        if (node?.isRoot) {
          yield* SubscriptionRef.update(
            traces,
            Array.filter((root) => root !== node)
          )
        }

        node = new SpanNode(span)
        cache.set(span.spanId, node)

        if (node.isRoot) {
          yield* SubscriptionRef.update(traces, Array.prepend(node))
        }

        if (span._tag === "Span" && span.parent._tag === "Some") {
          const parent = yield* registerSpan(span.parent.value)
          parent.addChild(span.spanId)
        }
      } else if (span._tag === "Span" && span.parent._tag === "Some") {
        yield* registerSpan(span.parent.value)
      }

      if (span._tag === "Span") {
        node.span = span
      }

      return node
    })
  }

  function registerSpanEvent(
    request: DevToolsDomain.SpanEvent
  ): Effect.Effect<void> {
    return Effect.suspend(() => {
      const span = cache.get(request.spanId)
      if (span === undefined) {
        return Effect.void
      }
      span.events.events.push(new SpanEventNode(span.span, request))
      return Effect.void
    })
  }

  function getSpanChildren(node: SpanNode): Array<SpanNode> {
    return node.children.map((id) => cache.get(id)!)
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
    traces,
    getSpanChildren
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

export class SpanNode {
  readonly _tag = "SpanNode"

  constructor(public span: DevToolsDomain.ParentSpan) {}

  events: EventsNode = new EventsNode([])

  get traceId() {
    return this.span.traceId
  }

  get spanId() {
    return this.span.spanId
  }

  get label() {
    return this.span._tag === "Span" ? this.span.name : "External Span"
  }

  get attributes() {
    return this.span._tag === "Span" ? this.span.attributes : new Map()
  }

  get isRoot() {
    if (this.span._tag === "ExternalSpan") {
      return true
    }

    return this.span.parent._tag === "None"
  }

  get duration(): Option.Option<Duration.Duration> {
    return Option.zipWith(
      this.startTime,
      this.endTime,
      (startTime, endTime) => Duration.subtract(endTime, startTime)
    )
  }

  get startTime(): Option.Option<Duration.Duration> {
    if (this.span._tag === "ExternalSpan") {
      return Option.none()
    }
    return Option.some(Duration.nanos(this.span.status.startTime))
  }

  get endTime(): Option.Option<Duration.Duration> {
    if (this.span._tag === "ExternalSpan") {
      return Option.none()
    }
    if (this.span.status._tag === "Ended") {
      return Option.some(Duration.nanos(this.span.status.endTime))
    }
    return Option.none()
  }

  private _children: Array<string> = []
  get children(): ReadonlyArray<string> {
    return this._children
  }

  addChild(spanId: string) {
    if (this._children.includes(spanId)) {
      return
    }
    this._children.push(spanId)
  }
}

export class EventsNode {
  readonly _tag = "EventsNode"
  constructor(readonly events: Array<SpanEventNode>) {}
  get hasEvents() {
    return this.events.length > 0
  }
}

export class SpanEventNode {
  readonly _tag = "SpanEventNode"
  constructor(
    readonly span: DevToolsDomain.ParentSpan,
    readonly event: DevToolsDomain.SpanEvent
  ) {}

  get hasAttributes() {
    return Object.keys(this.event.attributes).length > 0
  }

  get duration(): Option.Option<Duration.Duration> {
    if (this.span._tag === "ExternalSpan") {
      return Option.none()
    }
    return Option.some(
      Duration.nanos(this.event.startTime - this.span.status.startTime)
    )
  }
}
