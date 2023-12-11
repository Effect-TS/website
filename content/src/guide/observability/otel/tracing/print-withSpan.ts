import { Effect } from "effect"
import { NodeSdk } from "@effect/opentelemetry"
import {
  ConsoleSpanExporter,
  BatchSpanProcessor
} from "@opentelemetry/sdk-trace-base"

const program = Effect.unit.pipe(Effect.delay("100 millis"))

const instrumented = program.pipe(Effect.withSpan("myspan"))

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "example" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}))

Effect.runPromise(instrumented.pipe(Effect.provide(NodeSdkLive)))
/*
Example Output:
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
