import { Effect, Layer } from "effect"
import { NodeSdk, Resource, Tracer } from "@effect/opentelemetry"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"

const program = Effect.fail("Oh no!").pipe(
  Effect.delay("100 millis"),
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
  traceId: '760510a3f9a0881a09de990c87ec1cef',
  parentId: undefined,
  traceState: undefined,
  name: 'myspan',
  id: 'a528e38e82e848a5',
  kind: 0,
  timestamp: 1697091363002970.5,
  duration: 110371.664,
  attributes: {},
  status: { code: 2, message: 'Error: Oh no!' },
  events: [],
  links: []
}
*/
