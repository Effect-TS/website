import * as Schema from "effect/Schema"
import { formatPodcastDuration, formatPodcastPublicationDate } from "./utils"

export type EmbedConnectionPhase = "idle" | "connecting" | "connected" | "error"

export type TranscriptFollowMode = "auto" | "paused-by-user"

export interface SrtCue {
  readonly id: string
  readonly startTime: string
  readonly endTime: string
  readonly text: string
}

export type PlayerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error"

export type PodcastThumbnailPosterQuality =
  | "default"
  | "hqdefault"
  | "mqdefault"
  | "sddefault"
  | "maxresdefault"

export interface PlayerSnapshot {
  readonly videoId: string
  readonly title: string
  readonly status: PlayerStatus
  readonly currentTime: number
}

export interface DebugSnapshot {
  readonly eventCount: number
  readonly lastCommand: "playVideo" | "pauseVideo" | "none"
  readonly lastEvent: string
  readonly lastPlayerState: number | undefined
  readonly lastRawInfo: string
}

export const PodcastEpisodeId = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
  Schema.brand("PodcastEpisodeId"),
)
export type PodcastEpisodeId = typeof PodcastEpisodeId.Type

export class PodcastChapter extends Schema.Class<PodcastChapter>(
  "PodcastChapter",
)({
  id: Schema.String,
  title: Schema.String,
  label: Schema.String,
  startTimeSeconds: Schema.Int,
}) {}

export class PodcastTranscriptCue extends Schema.Class<PodcastTranscriptCue>(
  "PodcastTranscriptCue",
)({
  id: Schema.String,
  label: Schema.String,
  text: Schema.String,
  startTimeSeconds: Schema.Int,
  endTimeSeconds: Schema.Int,
}) {}

export class PodcastYouTubeInfo extends Schema.Class<PodcastYouTubeInfo>(
  "PodcastYouTubeInfo",
)({
  id: Schema.String,
}) {}

export class PodcastLinks extends Schema.Class<PodcastLinks>("PodcastLinks")({
  apple: Schema.String,
  spotify: Schema.String,
  youtube: Schema.String,
}) {}

export class PodcastEpisode extends Schema.Class<PodcastEpisode>(
  "PodcastEpisode",
)({
  id: PodcastEpisodeId,
  number: Schema.Int,
  title: Schema.String,
  guest: Schema.String,
  company: Schema.String,
  chapters: Schema.Array(PodcastChapter),
  transcript: Schema.Array(PodcastTranscriptCue),
  links: PodcastLinks,
  youtube: PodcastYouTubeInfo,
  duration: Schema.Duration,
  publishedOn: Schema.DateTimeUtc,
}) {
  get formattedDuration(): string {
    return formatPodcastDuration(this.duration)
  }

  get formattedPublicationDate(): string {
    return formatPodcastPublicationDate(this.publishedOn)
  }
}

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

export const Channel = Schema.Literal("widget")

export const PlayerStateCode = Schema.Union([
  Schema.Literal(-1),
  Schema.Literal(0),
  Schema.Literal(1),
  Schema.Literal(2),
  Schema.Literal(3),
  Schema.Literal(5),
])
export type PlayerStateCode = typeof PlayerStateCode.Type

export const ErrorCode = Schema.Union([
  Schema.Literal(2),
  Schema.Literal(5),
  Schema.Literal(100),
  Schema.Literal(101),
  Schema.Literal(150),
  Schema.Literal(153),
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
  videoData: Schema.optional(VideoDataPatch),
  videoLoadedFraction: Schema.optional(Schema.Number),
  videoUrl: Schema.optional(Schema.String),
  volume: Schema.optional(Schema.Number),
})
export type PlayerInfoPatch = typeof PlayerInfoPatch.Type

export const EventEnvelope = {
  channel: Schema.optional(Channel),
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
  YouTubeReadyEvent,
  YouTubeStateChangeEvent,
  YouTubeErrorEvent,
])
export type YouTubeEvent = typeof YouTubeEvent.Type
