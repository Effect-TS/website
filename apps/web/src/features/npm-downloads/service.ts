import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { NpmDownloadsError, RangeResponse } from "./domain"
import {
  dateRanges,
  isoDate,
  lastCompleteSunday,
  toWeeklyDownloads,
} from "./weeks"

// The range endpoint rejects windows longer than 18 months.
const WINDOW_DAYS = 500
const RETRIES = 2

const make = (retryDelay: Schedule.Schedule<unknown>) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    )

    const range = Effect.fn("NpmDownloads.range")(function* (
      packageName: string,
      from: number,
      to: number,
    ) {
      const url = `https://api.npmjs.org/downloads/range/${isoDate(from)}:${isoDate(to)}/${packageName}`
      const response = yield* client.get(url)
      return (yield* HttpClientResponse.schemaBodyJson(RangeResponse)(response))
        .downloads
    })

    /** Weekly totals from `from` (a Monday) to the last complete week before `now`. */
    const weekly = Effect.fn("NpmDownloads.weekly")(function* (options: {
      readonly packageName: string
      readonly from: string
      readonly now: Date
    }) {
      const windows = dateRanges(
        Date.parse(options.from),
        lastCompleteSunday(options.now),
        WINDOW_DAYS,
      )
      const days = yield* Effect.forEach(
        windows,
        (window) => range(options.packageName, window.from, window.to),
        { concurrency: "unbounded" },
      ).pipe(
        Effect.retry({ schedule: retryDelay, times: RETRIES }),
        Effect.mapError((cause) => new NpmDownloadsError({ cause })),
      )
      return toWeeklyDownloads(days.flat())
    })

    return { weekly } as const
  })

/** Download counts from the npm registry. Needs an `HttpClient`. */
export class NpmDownloads extends Context.Service<NpmDownloads>()(
  "website/NpmDownloads",
  {
    make: make(Schedule.exponential("1 second")),
  },
) {
  static layer = Layer.effect(this, this.make)
  /** Same service with another retry delay, for tests. */
  static layerWithRetryDelay = (retryDelay: Schedule.Schedule<unknown>) =>
    Layer.effect(this, make(retryDelay))
}
