import { Effect, Layer } from "effect"
import { NodeSdk, Resource, Tracer } from "@effect/opentelemetry"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"

const child = Effect.unit.pipe(
  Effect.delay("100 millis"),
  Effect.withSpan("child")
)

const parent = Effect.gen(function* (_) {
  yield* _(Effect.sleep("20 millis"))
  yield* _(child)
  yield* _(Effect.sleep("10 millis"))
}).pipe(Effect.withSpan("parent"))

const NodeSdkLive = NodeSdk.layer(() =>
  NodeSdk.config({ traceExporter: new ConsoleSpanExporter() })
)

const TracingLive = Layer.provide(
  Resource.layer({ serviceName: "example" }),
  Layer.merge(NodeSdkLive, Tracer.layer)
)

Effect.runPromise(parent.pipe(Effect.provide(TracingLive)))
/*
Output:
{
  traceId: '92fe81f1454d9c099198568cf867dc59',
  parentId: 'b953d6c7d37ad93d',
  traceState: undefined,
  name: 'child',
  id: '2fd19c8c23ebc7e8',
  kind: 0,
  timestamp: 1697043815321888.2,
  duration: 106536.264,
  attributes: {},
  status: { code: 1 },
  events: [],
  links: []
}
{
  traceId: '92fe81f1454d9c099198568cf867dc59',
  parentId: undefined,
  traceState: undefined,
  name: 'parent',
  id: 'b953d6c7d37ad93d',
  kind: 0,
  timestamp: 1697043815292133.2,
  duration: 149724.295,
  attributes: {},
  status: { code: 1 },
  events: [],
  links: []
}
*/
