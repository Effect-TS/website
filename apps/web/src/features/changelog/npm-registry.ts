import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

export class NpmRegistryError extends Data.TaggedError("NpmRegistryError")<{
  readonly cause: unknown
}> {}

const DistTags = Schema.Struct({ latest: Schema.String })

const Packument = Schema.Struct({
  time: Schema.Record(Schema.String, Schema.String),
})

/** What npm serves for a package right now. */
export interface PublishedRelease {
  /** The `latest` dist-tag: the version npm hands to `npm install`. */
  readonly latest: string
  /** `YYYY-MM-DD` (UTC) at which npm recorded each version. */
  readonly dates: ReadonlyMap<string, string>
}

const RETRIES = 2
const TIMEOUT = "15 seconds"
const REGISTRY = "https://registry.npmjs.org"

const encodeName = (name: string) =>
  encodeURIComponent(name).replace(/^%40/, "@")

const make = (retryDelay: Schedule.Schedule<unknown>) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    )

    // Not CDN-cached, and the dist-tag Effect's own promotion moves last.
    const latest = Effect.fn("NpmRegistry.latest")(function* (name: string) {
      const response = yield* client.get(
        `${REGISTRY}/-/package/${encodeName(name)}/dist-tags`,
      )
      return (yield* HttpClientResponse.schemaBodyJson(DistTags)(response))
        .latest
    })

    // Only the full document carries `time`.
    const dates = Effect.fn("NpmRegistry.dates")(function* (name: string) {
      const response = yield* client.get(`${REGISTRY}/${encodeName(name)}`)
      const { time } =
        yield* HttpClientResponse.schemaBodyJson(Packument)(response)
      return new Map(
        Object.entries(time)
          .filter(([key]) => key !== "created" && key !== "modified")
          .map(([version, iso]) => [version, iso.slice(0, 10)] as const),
      )
    })

    const published = Effect.fn("NpmRegistry.published")(function* (
      name: string,
    ) {
      const [latestVersion, versionDates] = yield* Effect.all(
        [latest(name), dates(name)],
        { concurrency: "unbounded" },
      ).pipe(
        Effect.timeout(TIMEOUT),
        Effect.retry({ schedule: retryDelay, times: RETRIES }),
        Effect.mapError((cause) => new NpmRegistryError({ cause })),
      )
      return { latest: latestVersion, dates: versionDates } as PublishedRelease
    })

    return { published } as const
  })

/** Release data from the npm registry. Needs an `HttpClient`. */
export class NpmRegistry extends Context.Service<NpmRegistry>()(
  "app/NpmRegistry",
  { make: make(Schedule.exponential("1 second")) },
) {
  static readonly layer = Layer.effect(this, this.make)
  /** Same service with another retry delay, for tests. */
  static readonly layerWithRetryDelay = (
    retryDelay: Schedule.Schedule<unknown>,
  ) => Layer.effect(this, make(retryDelay))
}
