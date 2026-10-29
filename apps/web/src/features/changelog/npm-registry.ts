import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
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

const REGISTRY = "https://registry.npmjs.org"
// Per attempt, until the response headers arrive.
const ATTEMPT_TIMEOUT = "15 seconds"
// The whole lookup, body included.
const LOOKUP_TIMEOUT = "60 seconds"
const RETRIES = 2

const encodeName = (name: string) =>
  encodeURIComponent(name).replace(/^%40/, "@")

/** Release data from the npm registry. Needs an `HttpClient`. */
export class NpmRegistry extends Context.Service<NpmRegistry>()(
  "app/NpmRegistry",
  {
    make: Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.filterStatusOk,
        HttpClient.transformResponse(Effect.timeout(ATTEMPT_TIMEOUT)),
        // Transport errors, timeouts and 408/429/5xx only: a 404 or a body
        // that does not decode will not improve on a second try.
        HttpClient.retryTransient({
          schedule: Schedule.exponential("1 second"),
          times: RETRIES,
        }),
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

      const published = Effect.fn("NpmRegistry.published")(
        function* (name: string) {
          const [version, versionDates] = yield* Effect.all(
            [latest(name), dates(name)],
            { concurrency: "unbounded" },
          ).pipe(Effect.timeout(LOOKUP_TIMEOUT))
          // The packument is cached by the registry CDN for minutes, the
          // dist-tag is not, so right after a promotion the two can disagree.
          if (!versionDates.has(version)) {
            return yield* Effect.fail(
              `${name}@${version} is the latest dist-tag but missing from the packument`,
            )
          }
          const release: PublishedRelease = {
            latest: version,
            dates: versionDates,
          }
          return release
        },
        Effect.mapError((cause) => new NpmRegistryError({ cause })),
      )

      return { published } as const
    }),
  },
) {
  static readonly layerNoDeps = Layer.effect(this, this.make)
  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide(FetchHttpClient.layer),
  )
}
