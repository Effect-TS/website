// You write this yourself in lesson 16.
import { Layer, Logger } from "effect"
import { FetchHttpClient } from "effect/http"
import { OtlpLogger, OtlpSerialization, OtlpTracer } from "effect/observability"

const resource = { serviceName: "rulebook-lessons" }

export const layer: Layer.Layer<never> = Layer.mergeAll(
  OtlpTracer.layer({ url: "http://localhost:4318/v1/traces", resource }),
  OtlpLogger.layer({ url: "http://localhost:4318/v1/logs", resource })
).pipe(
  Layer.provide(Logger.layer([Logger.consolePretty()])),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer)
)
