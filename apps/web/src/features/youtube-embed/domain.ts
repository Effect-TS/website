import * as Data from "effect/Data"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as SchemaTransformation from "effect/SchemaTransformation"

export interface YouTubeVideo {
  readonly id: string
  readonly title: string
}

export interface YouTubeVideoChapter {
  readonly id: string
  readonly title: string
  readonly label: string
  readonly startTimeSeconds: number
}

//==============================================================================
// Embed Command
//==============================================================================

export class PlayVideoCommand extends Schema.Class<PlayVideoCommand>(
  "PlayVideoCommand",
)({
  event: Schema.tag("command"),
  func: Schema.tag("playVideo"),
  id: Schema.tag(1),
}) {}

export class PauseVideoCommand extends Schema.Class<PauseVideoCommand>(
  "PauseVideoCommand",
)({
  event: Schema.tag("command"),
  func: Schema.tag("pauseVideo"),
  id: Schema.tag(1),
}) {}

export class SeekToCommand extends Schema.Class<SeekToCommand>("SeekToCommand")(
  {
    event: Schema.tag("command"),
    func: Schema.tag("seekTo"),
    args: Schema.Tuple([Schema.Number, Schema.Boolean]),
    id: Schema.tag(1),
  },
) {}

export const EmbedCommand = Schema.Union([
  PlayVideoCommand,
  PauseVideoCommand,
  SeekToCommand,
]).pipe(Schema.toTaggedUnion("func"))
export type EmbedCommand = typeof EmbedCommand.Type

//==============================================================================
// Embed State
//==============================================================================

export type EmbedState = Data.TaggedEnum<{
  readonly NotMounted: {}
  readonly Mounting: {}
  readonly Handshaking: {}
  readonly Active: { readonly playback: PlaybackState }
  readonly Failed: {}
}>
export const EmbedState = Data.taggedEnum<EmbedState>()

//==============================================================================
// Playback State
//==============================================================================

export interface PlaybackTimeFields {
  readonly currentTimeSeconds: number
}

export type PlaybackState = Data.TaggedEnum<{
  readonly Unstarted: {}
  readonly Cued: PlaybackTimeFields
  readonly Playing: PlaybackTimeFields
  readonly Paused: PlaybackTimeFields
  readonly Buffering: PlaybackTimeFields
  readonly Ended: PlaybackTimeFields
}>
export const PlaybackState = Data.taggedEnum<PlaybackState>()

//==============================================================================
// YouTube Event
//==============================================================================

const stateCode = <N extends number, C extends string>(n: N, c: C) =>
  Schema.Literal(n).pipe(
    Schema.decodeTo(
      Schema.Literal(c),
      SchemaTransformation.make({
        decode: SchemaGetter.succeed(c),
        encode: SchemaGetter.succeed(n),
      }),
    ),
  )

export const PlayerStateCode = Schema.Union([
  stateCode(-1, "UNSTARTED"),
  stateCode(0, "ENDED"),
  stateCode(1, "PLAYING"),
  stateCode(2, "PAUSED"),
  stateCode(3, "BUFFERING"),
  stateCode(5, "CUED"),
])
export type PlayerStateCode = typeof PlayerStateCode.Type

const errorCode = <N extends number, C extends string>(n: N, c: C) =>
  Schema.Literal(n).pipe(
    Schema.decodeTo(
      Schema.Literal(c),
      SchemaTransformation.make({
        decode: SchemaGetter.succeed(c),
        encode: SchemaGetter.succeed(n),
      }),
    ),
  )

export const ErrorCode = Schema.Union([
  errorCode(2, "INVALID_PARAM"),
  errorCode(5, "HTML5_ERROR"),
  errorCode(100, "VIDEO_NOT_FOUND"),
  errorCode(101, "NOT_EMBEDDABLE"),
  errorCode(150, "NOT_EMBEDDABLE_DISGUISED"),
  errorCode(153, "REFERRER_NOT_FOUND"),
])
export type ErrorCode = typeof ErrorCode.Type

export const VideoDataPatch = Schema.Struct({
  author: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  video_id: Schema.optional(Schema.String),
})

export const PlayerInfoPatch = Schema.Struct({
  apiInterface: Schema.optional(Schema.Array(Schema.String)),
  availableQualityLevels: Schema.optional(Schema.Array(Schema.String)),
  currentTime: Schema.optional(Schema.Number),
  currentTimeLastUpdated_: Schema.optional(Schema.Number),
  duration: Schema.optional(Schema.Number),
  muted: Schema.optional(Schema.Boolean),
  playbackQuality: Schema.optional(Schema.String),
  playbackRate: Schema.optional(Schema.Number),
  playerState: Schema.optional(PlayerStateCode),
  translationLanguages: Schema.optional(Schema.Array(Schema.String)),
  videoData: Schema.optional(VideoDataPatch),
  videoLoadedFraction: Schema.optional(Schema.NullOr(Schema.Number)),
  videoUrl: Schema.optional(Schema.String),
  volume: Schema.optional(Schema.Number),
})
export type PlayerInfoPatch = typeof PlayerInfoPatch.Type

export const EventEnvelope = {
  channel: Schema.optional(Schema.Literal("widget")),
  id: Schema.optional(Schema.Number),
} as const

export class YouTubeInitialDeliveryEvent extends Schema.Class<YouTubeInitialDeliveryEvent>(
  "YouTubeInitialDeliveryEvent",
)({
  ...EventEnvelope,
  event: Schema.Literal("initialDelivery"),
  info: PlayerInfoPatch,
}) {}

export class YouTubeInfoDeliveryEvent extends Schema.Class<YouTubeInfoDeliveryEvent>(
  "YouTubeInfoDeliveryEvent",
)({
  ...EventEnvelope,
  event: Schema.Literal("infoDelivery"),
  info: PlayerInfoPatch,
}) {}

export const VideoReceiver = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
})
export type VideoReceiver = typeof VideoReceiver.Type

export class YouTubeApiInfoDeliveryEvent extends Schema.Class<YouTubeApiInfoDeliveryEvent>(
  "YouTubeApiInfoDeliveryEvent",
)({
  ...EventEnvelope,
  event: Schema.Literal("apiInfoDelivery"),
  info: Schema.Struct({
    captions: Schema.Struct({
      options: Schema.Array(Schema.String),
      track: Schema.Record(Schema.String, Schema.Unknown),
      tracklist: Schema.optional(Schema.Array(Schema.String)),
      translationLanguages: Schema.Array(Schema.String),
    }),
    namespaces: Schema.Array(Schema.String),
    remote: Schema.optional(
      Schema.Struct({
        casting: Schema.Boolean,
        currentReceiver: VideoReceiver,
        options: Schema.Array(Schema.String),
        quickCast: Schema.Boolean,
        receivers: Schema.Array(VideoReceiver),
      }),
    ),
  }),
}) {}

export class YouTubeReadyEvent extends Schema.Class<YouTubeReadyEvent>(
  "YouTubeReadyEvent",
)({
  ...EventEnvelope,
  event: Schema.Literal("onReady"),
}) {}

export class YouTubeStateChangeEvent extends Schema.Class<YouTubeStateChangeEvent>(
  "YouTubeStateChangeEvent",
)({
  ...EventEnvelope,
  event: Schema.Literal("onStateChange"),
  info: PlayerStateCode,
}) {}

export class YouTubeErrorEvent extends Schema.Class<YouTubeErrorEvent>(
  "YouTubeErrorEvent",
)({
  ...EventEnvelope,
  event: Schema.Literal("onError"),
  info: ErrorCode,
}) {}

export const YouTubeEvent = Schema.Union([
  YouTubeInitialDeliveryEvent,
  YouTubeInfoDeliveryEvent,
  YouTubeApiInfoDeliveryEvent,
  YouTubeReadyEvent,
  YouTubeStateChangeEvent,
  YouTubeErrorEvent,
])
export type YouTubeEvent = typeof YouTubeEvent.Type
