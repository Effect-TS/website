import { make } from "@maple-dev/effect-sdk/cloudflare"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as UrlParams from "effect/http/UrlParams"

// Server traces and logs from the Worker's API routes, sent to Maple. The SDK
// reads `MAPLE_INGEST_KEY`, `MAPLE_ENVIRONMENT` and `COMMIT_SHA` from the
// Worker's env on the first flush. Without a key (`astro dev`, forks) it drops
// everything, so routes can always include it.
export const telemetry = make({ serviceName: "effect-website" })

/**
 * URL parameters recorded as `REDACTED` in span attributes such as `url.full`.
 * `query` is what visitors type into search.
 */
export const REDACTED_URL_PARAMS: ReadonlyArray<string> = ["query"]

/** Adds {@link REDACTED_URL_PARAMS} to Effect's redacted URL parameters. */
export const RedactUrlParamsLayer = Layer.effect(
  UrlParams.CurrentRedactedNames,
  Effect.gen(function* () {
    const names = yield* UrlParams.CurrentRedactedNames
    return [...names, ...REDACTED_URL_PARAMS]
  }),
)

/** Provide to the layer handed to `HttpRouter.toWebHandler`. */
export const TelemetryLayer = Layer.merge(telemetry.layer, RedactUrlParamsLayer)
