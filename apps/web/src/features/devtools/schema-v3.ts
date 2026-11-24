/**
 * Represents a compatibility layer between the Effect v3 DevTools wire protocol
 * and the Effect v4 DevTools wire protocol. This allows an Effect v3 based
 * playground program to send events to an Effect v4 based backend.
 */
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as SchemaTransformation from "effect/SchemaTransformation"

export const SpanStatusStarted = Schema.Struct({
  _tag: Schema.tag("Started"),
  startTime: Schema.BigInt,
})
export type SpanStatusStarted = Schema.Schema.Type<typeof SpanStatusStarted>

const SpanExit = Schema.Exit(
  Schema.Void,
  Schema.Defect({ includeStack: true }),
  Schema.Defect({ includeStack: true }),
).pipe(
  Schema.decodeTo(
    Schema.Exit(Schema.Unknown, Schema.Unknown, Schema.Unknown),
    SchemaTransformation.transform({
      decode: identity,
      encode: Exit.asVoid,
    }),
  ),
)

export const SpanStatusEnded = Schema.TaggedStruct("Ended", {
  startTime: Schema.BigInt,
  endTime: Schema.BigInt,
  exit: SpanExit.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(Exit.succeed(undefined))),
  ),
})
export type SpanStatusEnded = Schema.Schema.Type<typeof SpanStatusEnded>

export const SpanStatus = Schema.Union([SpanStatusStarted, SpanStatusEnded])
export type SpanStatus = typeof SpanStatus.Type
export type SpanStatusEncoded = typeof SpanStatus.Encoded

export interface ExternalSpan {
  readonly _tag: "ExternalSpan"
  readonly spanId: string
  readonly traceId: string
  readonly sampled: boolean
}

export const ExternalSpan = Schema.TaggedStruct("ExternalSpan", {
  spanId: Schema.String,
  traceId: Schema.String,
  sampled: Schema.Boolean,
})

export interface Span {
  readonly _tag: "Span"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly sampled: boolean
  readonly attributes: ReadonlyMap<string, unknown>
  readonly status: SpanStatus
  readonly parent: Option.Option<ParentSpan>
}

export interface SpanEncoded {
  readonly _tag: "Span"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly sampled: boolean
  readonly attributes: ReadonlyMap<string, unknown>
  readonly status: SpanStatusEncoded
  readonly parent: Option.Option<ParentSpanEncoded>
}

export const Span: Schema.Codec<Span, SpanEncoded> = Schema.TaggedStruct(
  "Span",
  {
    spanId: Schema.String,
    traceId: Schema.String,
    name: Schema.String,
    sampled: Schema.Boolean,
    attributes: Schema.ReadonlyMap(Schema.String, Schema.Any),
    status: SpanStatus,
    parent: Schema.Option(Schema.suspend(() => ParentSpan)),
  },
)

/**
 * Schema for a named event emitted by a span, including trace id, span id,
 * start time, and optional attributes.
 *
 * @category schemas
 * @since 4.0.0
 */
export const SpanEvent = Schema.TaggedStruct("SpanEvent", {
  traceId: Schema.String,
  spanId: Schema.String,
  name: Schema.String,
  startTime: Schema.BigInt,
  attributes: Schema.UndefinedOr(Schema.Record(Schema.String, Schema.Any)),
})
export type SpanEvent = Schema.Schema.Type<typeof SpanEvent>

export type ParentSpan = Span | ExternalSpan
export type ParentSpanEncoded = SpanEncoded | ExternalSpan

export const ParentSpan = Schema.Union([Span, ExternalSpan])

export const Ping = Schema.TaggedStruct("Ping", {})
export type Ping = Schema.Schema.Type<typeof Ping>

export const Pong = Schema.TaggedStruct("Pong", {})
export type Pong = Schema.Schema.Type<typeof Pong>

export const MetricsRequest = Schema.TaggedStruct("MetricsRequest", {})
export type MetricsRequest = Schema.Schema.Type<typeof MetricsRequest>

export const MetricLabel = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
})
export type MetricLabel = Schema.Schema.Type<typeof MetricLabel>

const metric = <Type extends string, State extends Schema.Top>(
  type: Type,
  state: State,
) =>
  Schema.Struct({
    id: Schema.String,
    type: Schema.tag(type),
    description: Schema.optional(Schema.String).pipe(
      Schema.decodeTo(Schema.UndefinedOr(Schema.String), {
        decode: SchemaGetter.transformOptional(
          Option.match({
            onNone: () => Option.some(undefined),
            onSome: Option.some,
          }),
        ),
        encode: SchemaGetter.passthrough(),
      }),
    ),
    attributes: Schema.Array(MetricLabel).pipe(
      Schema.decodeTo(
        Schema.UndefinedOr(Schema.Record(Schema.String, Schema.String)),
        {
          decode: SchemaGetter.transform((entries) =>
            entries.length > 0
              ? entries.reduce(
                  (acc, curr) => {
                    acc[curr.key] = curr.value
                    return acc
                  },
                  {} as Record<string, string>,
                )
              : undefined,
          ),
          encode: SchemaGetter.transform((record) =>
            record === undefined
              ? []
              : Object.entries(record).map(([key, value]) => ({ key, value })),
          ),
        },
      ),
    ),
    state,
  }).pipe(
    Schema.encodeKeys({
      type: "_tag",
      id: "name",
      attributes: "tags",
    }),
  )

export const Counter = metric(
  "Counter",
  Schema.Struct({
    count: Schema.Union([Schema.Number, Schema.BigInt]),
    incremental: Schema.Boolean.pipe(
      Schema.withDecodingDefault(Effect.succeed(true)),
    ),
  }),
)
export type Counter = Schema.Schema.Type<typeof Counter>

export const Frequency = metric(
  "Frequency",
  Schema.Struct({
    occurrences: Schema.ReadonlyMap(Schema.String, Schema.Number),
  }),
)
export type Frequency = Schema.Schema.Type<typeof Frequency>

export const Gauge = metric(
  "Gauge",
  Schema.Struct({
    value: Schema.Union([Schema.Number, Schema.BigInt]),
  }),
)
export type Gauge = Schema.Schema.Type<typeof Gauge>

const NumberOrInfinity = Schema.NullOr(Schema.Number).pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.transform({
      decode: (i) => (i === null ? Number.POSITIVE_INFINITY : i),
      encode: (i) => (Number.isFinite(i) ? i : null),
    }),
  ),
)

export const Histogram = metric(
  "Histogram",
  Schema.Struct({
    buckets: Schema.Array(Schema.Tuple([NumberOrInfinity, Schema.Number])),
    count: Schema.Number,
    min: Schema.Number,
    max: Schema.Number,
    sum: Schema.Number,
  }),
)
export type Histogram = Schema.Schema.Type<typeof Histogram>

export const Summary = metric(
  "Summary",
  Schema.Struct({
    quantiles: Schema.Array(
      Schema.Tuple([Schema.Number, Schema.UndefinedOr(Schema.Number)]),
    ),
    count: Schema.Number,
    min: Schema.Number,
    max: Schema.Number,
    sum: Schema.Number,
  }),
)
export type Summary = Schema.Schema.Type<typeof Summary>

export const Metric = Schema.Union([
  Counter,
  Frequency,
  Gauge,
  Histogram,
  Summary,
])
export type Metric = Schema.Schema.Type<typeof Metric>

export const MetricsSnapshot = Schema.TaggedStruct("MetricsSnapshot", {
  metrics: Schema.Array(Metric),
})
export type MetricsSnapshot = Schema.Schema.Type<typeof MetricsSnapshot>

export const Request = Schema.Union([Ping, Span, SpanEvent, MetricsSnapshot])
export type Request = Schema.Schema.Type<typeof Request>

export declare namespace Request {
  export type WithoutPing = Exclude<Request, { readonly _tag: "Ping" }>
}

export const Response = Schema.Union([Pong, MetricsRequest])
export type Response = Schema.Schema.Type<typeof Response>

export declare namespace Response {
  export type WithoutPong = Exclude<Response, { readonly _tag: "Pong" }>
}
