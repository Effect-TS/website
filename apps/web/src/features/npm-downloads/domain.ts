import * as Data from "effect/Data"
import * as Schema from "effect/Schema"

export class NpmDownloadsError extends Data.TaggedError("NpmDownloadsError")<{
  readonly cause: unknown
}> {}

/** Response of `api.npmjs.org/downloads/range`. npm reports a missing day as `0`. */
export const RangeResponse = Schema.Struct({
  downloads: Schema.Array(
    Schema.Struct({ day: Schema.String, downloads: Schema.Number }),
  ),
})

export type DailyDownloads = (typeof RangeResponse.Type)["downloads"][number]

export interface WeeklyDownloads {
  /** Monday of the week, `YYYY-MM-DD`. */
  readonly weekStart: string
  readonly downloads: number
}
