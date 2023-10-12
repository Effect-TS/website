import { Effect, Layer } from "effect"
import { NodeSdk, Resource, Tracer } from "@effect/opentelemetry"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"

const program = Effect.unit.pipe(
  Effect.delay("100 millis"),
  Effect.tap(() => Effect.annotateCurrentSpan("key", "value")),
  Effect.withSpan("myspan")
)

const NodeSdkLive = NodeSdk.layer(() =>
  NodeSdk.config({ traceExporter: new ConsoleSpanExporter() })
)

const TracingLive = Layer.provide(
  Resource.layer({ serviceName: "example" }),
  Layer.merge(NodeSdkLive, Tracer.layer)
)

Effect.runPromise(program.pipe(Effect.provide(TracingLive)))
/*
Output:
{
  traceId: '869c9d74d9db14a4ba4393ca8e0f61db',
  parentId: undefined,
  traceState: undefined,
  name: 'myspan',
  id: '31eb49570d197f8d',
  kind: 0,
  timestamp: 1697045981663321.5,
  duration: 109563.353,
  attributes: { key: 'value' },
  status: { code: 1 },
  events: [],
  links: []
}
*/
