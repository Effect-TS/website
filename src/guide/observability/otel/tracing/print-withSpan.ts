import { Effect, Layer } from "effect"
import { NodeSdk, Resource, Tracer } from "@effect/opentelemetry"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"

const program = Effect.unit.pipe(Effect.delay("100 millis"))

const instrumented = program.pipe(Effect.withSpan("myspan"))

const ResourceLive = Resource.layer({ serviceName: "example" })

const NodeSdkLive = NodeSdk.layer(() =>
  NodeSdk.config({
    traceExporter: new ConsoleSpanExporter()
  })
)

const TracingLive = Layer.provide(
  ResourceLive,
  Layer.merge(NodeSdkLive, Tracer.layer)
)

Effect.runPromise(instrumented.pipe(Effect.provide(TracingLive)))
/*
Output:
{
  traceId: 'd0f730abfc366205806469596092b239',
  parentId: undefined,
  traceState: undefined,
  name: 'myspan',
  id: 'ab4e42592e7f1f7c',
  kind: 0,
  timestamp: 1697040012664380.5,
  duration: 2895.769,
  attributes: {},
  status: { code: 1 },
  events: [],
  links: []
}
*/
