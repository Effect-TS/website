import { Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { OtlpLogger, OtlpSerialization, OtlpTracer } from "effect/observability"

// Exports spans and logs to otel-desktop-viewer. The service name tells the
// two programs apart in the viewer. A trace still crosses from one to the
// other: the CLI's HttpClient sends the current span in a `traceparent`
// header, and the server starts its request span under it.
const layer = (serviceName: string): Layer.Layer<never> =>
  Layer.mergeAll(
    OtlpTracer.layer({ url: "http://localhost:4318/v1/traces", resource: { serviceName } }),
    OtlpLogger.layer({ url: "http://localhost:4318/v1/logs", resource: { serviceName } })
  ).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer)
  )

export const layerServer = layer("rulebook-server")

export const layerCli = layer("rulebook-cli")
