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

  const registry = new Map<string, RxRef.RxRef<SpanNode>>()
  const rootSpans = yield* SubscriptionRef.make(
    Array.empty<RxRef.RxRef<SpanNode>>()
  )

  function registerSpan(
    span: DevToolsDomain.ParentSpan
  ): Effect.Effect<RxRef.RxRef<SpanNode>> {
    return Effect.gen(function* () {
      let ref = registry.get(span.spanId)

      // The incoming span is considered an upgrade if:
      //   1. There is an existing EXTERNAL span registered with the same span
      //      identifier as the incoming span in the span registry
      //   2. The incoming span is NOT an external span
      // This set of conditions indicates that the external span in the registry
      // should be replaced with the incoming span.
      const isUpgrade =
        span._tag === "Span" &&
        ref !== undefined &&
        ref.value.span._tag === "ExternalSpan"

      // Handle the case where we haven't yet added the incoming span to the
      // registry, or we need to upgrade the existing span
      if (ref === undefined || isUpgrade) {
        // // Before any other man
        // if (ref !== undefined && ref.value.isRoot) {
        //   yield* SubscriptionRef.update(
        //     rootSpans,
        //     Array.filter((spanRef) => spanRef !== ref)
        //   )
        // }

        // Create the span node and add its ref to the registry
        ref = RxRef.make(new SpanNode(span))
        registry.set(span.spanId, ref)

        // Update the subscription ref if it's a root span
        if (ref.value.isRoot) {
          yield* SubscriptionRef.update(rootSpans, Array.prepend(ref))
        }

        // Register the parent span, if necessary and add the incoming span as
        // a child to the parent
        if (span._tag === "Span" && span.parent._tag === "Some") {
          const parentRef = yield* registerSpan(span.parent.value)
          parentRef.update((node) => node.addChild(ref!))
        }

        // Handle the case where the incoming span is a child of another span
      } else if (span._tag === "Span" && span.parent._tag === "Some") {
        yield* registerSpan(span.parent.value)
      }

      if (span._tag === "Span") {
        ref.update((node) => node.setSpan(span))
      }

      return ref
    })
  }

  function registerSpanEvent(
    event: DevToolsDomain.SpanEvent
  ): Effect.Effect<void> {
    return Effect.sync(() => {
      const ref = registry.get(event.spanId)
      if (ref !== undefined) {
        ref.update((node) =>
          node.addEvent(new SpanEventNode(node.span, event))
        )
      }
    })
  }

  function getSpanChildren(node: SpanNode): Array<RxRef.RxRef<SpanNode>> {
    return node.children.map((ref) => registry.get(ref.value.spanId)!)
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
    rootSpans,
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
  readonly children: ReadonlyArray<RxRef.RxRef<SpanNode>>
  readonly events: ReadonlyArray<SpanEventNode>

  constructor(
    readonly span: DevToolsDomain.ParentSpan,
    props: {
      readonly children?: ReadonlyArray<RxRef.RxRef<SpanNode>>
      readonly events?: ReadonlyArray<SpanEventNode>
    } = {}
  ) {
    this.children = props.children ?? []
    this.events = props.events ?? []
  }

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

  setSpan(span: DevToolsDomain.ParentSpan) {
    return new SpanNode(span, {
      children: this.children.slice(),
      events: this.events.slice()
    })
  }

  addChild(ref: RxRef.RxRef<SpanNode>) {
    if (this.children.includes(ref)) {
      return this
    }
    return new SpanNode(this.span, {
      children: Array.append(this.children, ref!),
      events: this.events.slice()
    })
  }

  addEvent(event: SpanEventNode) {
    return new SpanNode(this.span, {
      children: this.children.slice(),
      events: Array.append(this.events, event)
    })
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
