import {
  Array,
  Console,
  Duration,
  Effect,
  Layer,
  Option,
  Stream,
  SubscriptionRef
} from "effect"
import * as DevToolsDomain from "@effect/experimental/DevTools/Domain"
import { WebContainer } from "./WebContainer"

export class SpanNode {
  readonly _tag = "SpanNode"

  constructor(public span: DevToolsDomain.ParentSpan) {}

  events: EventsNode = new EventsNode([])

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
    if (this.span._tag === "ExternalSpan") {
      return Option.none()
    }

    if (this.span.status._tag === "Ended") {
      return Option.some(
        Duration.nanos(this.span.status.endTime - this.span.status.startTime)
      )
    }
    return Option.none()
  }

  private _children: Array<string> = []
  get children(): Array<string> {
    return this._children
  }

  addChild(spanId: string) {
    if (this._children.includes(spanId)) {
      return
    }
    this._children.unshift(spanId)
  }
}

class EventsNode {
  readonly _tag = "EventsNode"
  constructor(readonly events: Array<SpanEventNode>) {}
  get hasEvents() {
    return this.events.length > 0
  }
}

class SpanEventNode {
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

const make = Effect.gen(function* () {
  const container = yield* WebContainer
  const rootNodes: Array<SpanNode> = []
  const nodeCache = new Map<string, SpanNode>()
  const spans = yield* SubscriptionRef.make(Array.empty<SpanNode>())

  function addNode(span: DevToolsDomain.ParentSpan): SpanNode {
    let node = nodeCache.get(span.spanId)
    let parent: SpanNode | undefined
    const isUpgrade =
      span._tag === "Span" && node?.span._tag === "ExternalSpan"

    if (node === undefined || isUpgrade) {
      if (node?.isRoot) {
        const nodeIndex = rootNodes.indexOf(node)
        rootNodes.splice(nodeIndex, 1)
      }

      node = new SpanNode(span)
      nodeCache.set(span.spanId, node)

      if (node.isRoot) {
        rootNodes.unshift(node)
      }

      if (span._tag === "Span" && span.parent._tag === "Some") {
        parent = addNode(span.parent.value)
        parent.addChild(span.spanId)
      }
    } else if (span._tag === "Span" && span.parent._tag === "Some") {
      parent = addNode(span.parent.value)
    }

    if (span._tag === "Span") {
      node.span = span
    }

    return node
  }

  yield* container.devTools.pipe(
    Stream.runForEach((event) =>
      Effect.suspend(() => {
        switch (event._tag) {
          case "MetricsSnapshot": {
            return Effect.void
          }
          case "Span": {
            addNode(event)
            return SubscriptionRef.set(spans, rootNodes)
          }
          case "SpanEvent": {
            const span = nodeCache.get(event.spanId)
            if (span !== undefined) {
              span.events.events.push(new SpanEventNode(span.span, event))
            }
            return SubscriptionRef.set(spans, rootNodes)
          }
        }
      })
    ),
    Effect.forkScoped
  )

  return {
    spans
  } as const
})

export class SpanProvider extends Effect.Tag("SpanProvider")<
  SpanProvider,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make).pipe(
    Layer.provide(WebContainer.Live)
  )
}
