import { ParentSpan, SpanEvent } from "@effect/experimental/DevTools/Domain"
import * as Array from "effect/Array"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"

export class Span {
  static fromSpan(span: ParentSpan): Span {
    // Because incoming spans are always linear (i.e. no branches) up to the
    // root span, this algorithm simply linearizes the incoming span
    let current: Span | undefined = undefined
    let node: ParentSpan | undefined = span
    while (node !== undefined) {
      current = new Span({ span, children: Array.fromNullable(current) })
      node = node._tag === "ExternalSpan" ? undefined : Option.getOrUndefined(node.parent)
    }
    return current!
  }

  readonly span: ParentSpan
  readonly children: ReadonlyArray<Span>
  readonly events: ReadonlyArray<Event>

  constructor(props: {
    readonly span: ParentSpan
    readonly children?: ReadonlyArray<Span>
    readonly events?: ReadonlyArray<Event>
  }) {
    this.span = props.span
    this.children = props.children ?? []
    this.events = props.events ?? []
  }

  /**
   * The trace identifier for the span.
   */
  get traceId(): string {
    return this.span.traceId
  }

  /**
   * The span identifier.
   */
  get spanId(): string {
    return this.span.spanId
  }

  /**
   * Returns `true` if this is a root span, `false` otherwise.
   */
  get isRoot(): boolean {
    return this.span._tag === "ExternalSpan" || Option.isNone(this.span.parent)
  }

  /**
   * Returns `true` if this is an external span, `false` otherwise.
   */
  get isExternal(): boolean {
    return this.span._tag === "ExternalSpan"
  }

  get hasError(): boolean {
    return this.span._tag !== "ExternalSpan" && this.span.attributes.get("code.stacktrace") !== undefined
  }

  /**
   * The label for the span.
   */
  get label(): string {
    return this.span._tag === "ExternalSpan" ? "External Span" : this.span.name
  }

  /**
   * The span attributes.
   */
  get attributes(): ReadonlyMap<string, unknown> {
    return this.span._tag === "Span" ? this.span.attributes : new Map()
  }

  /**
   * The start time of the span.
   *
   * Will be `None` if the span is external.
   */
  get startTime(): Option.Option<bigint> {
    if (this.span._tag === "ExternalSpan") {
      return Option.none()
    }
    return Option.some(this.span.status.startTime)
  }

  /**
   * The start time of the span.
   *
   * Will be `None` if the span is external or if the span has not ended.
   */
  get endTime(): Option.Option<bigint> {
    if (this.span._tag === "ExternalSpan") {
      return Option.none()
    }
    if (this.span.status._tag === "Ended") {
      return Option.some(this.span.status.endTime)
    }
    return Option.none()
  }

  /**
   * The duration of the span.
   *
   * Will be `None` if the span is external or if the span has not ended.
   */
  get duration(): Option.Option<Duration.Duration> {
    return Option.zipWith(this.startTime, this.endTime, (startTime, endTime) => Duration.subtract(endTime, startTime))
  }

  /**
   * Adds the provided `span` to this span.
   */
  addSpan(span: ParentSpan): Span {
    // If the incoming span is an external span, it becomes the root
    if (span._tag === "ExternalSpan") {
      return new Span({ span })
    }
    // If this span is an external span and the incoming span is a regualar span
    // then we need to upgrade this span
    const isUpgrade = span._tag === "Span" && this.span._tag === "ExternalSpan"
    if (isUpgrade && Option.isNone(span.parent)) {
      return new Span({ span })
    }
    return Option.match(span.parent, {
      // If the incoming span is a root span, clone the existing root span
      onNone: () =>
        new Span({
          span,
          children: this.children,
          events: this.events
        }),
      // Otherwise add the incoming span as a child
      onSome: (parent) =>
        this.spanId === parent.spanId ? this.addChild(span) : this.mapChildren((child) => child.addSpan(span))
    })
  }

  /**
   * Adds the provided `event` to this span.
   */
  addEvent(event: SpanEvent): Span {
    if (this.spanId === event.spanId) {
      return new Span({
        span: this.span,
        children: this.children,
        events: Array.append(this.events, Event.fromEvent(event))
      })
    }
    return this.mapChildren((child) => child.addEvent(event))
  }

  /**
   * Adds the provided span to the children of this span.
   */
  addChild(span: ParentSpan) {
    const children = pipe(
      this.children,
      Array.findFirstIndex((child) => child.spanId === span.spanId),
      Option.match({
        onNone: () => Array.append(this.children, new Span({ span })),
        onSome: (index) =>
          Array.modify(
            this.children,
            index,
            (child) =>
              new Span({
                span,
                children: child.children,
                events: child.events
              })
          )
      })
    )
    return new Span({ span: this.span, children, events: this.events })
  }

  /**
   * Applies the provided function to the children of this span.
   */
  mapChildren(f: (tree: Span) => Span): Span {
    return new Span({
      span: this.span,
      children: Array.map(this.children, f),
      events: this.events
    })
  }

  clone(): Span {
    return new Span({
      span: this.span,
      children: this.children,
      events: this.events
    })
  }
}

export class Event extends Data.Class<{
  readonly event: SpanEvent
}> {
  static fromEvent(event: SpanEvent) {
    return new Event({ event })
  }

  get traceId(): string {
    return this.event.traceId
  }

  get spanId(): string {
    return this.event.spanId
  }

  get name(): string {
    return this.event.name
  }
}
