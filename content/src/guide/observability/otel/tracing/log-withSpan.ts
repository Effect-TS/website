import { Effect } from "effect"
import { NodeSdk } from "@effect/opentelemetry"
import {
  ConsoleSpanExporter,
  BatchSpanProcessor
} from "@opentelemetry/sdk-trace-base"

const program = Effect.log("Hello").pipe(
  Effect.delay("100 millis"),
  Effect.withSpan("myspan")
)

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "example" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}))

Effect.runPromise(program.pipe(Effect.provide(NodeSdkLive)))
/*
Example Output:
{
  traceId: 'ad708d58c15f9e5c7b5cca2eeb6838a2',
  parentId: undefined,
  traceState: undefined,
  name: 'myspan',
  id: '4353fd47423e786a',
  kind: 0,
  timestamp: 1697043230170724.2,
  duration: 112052.514,
  attributes: {},
  status: { code: 1 },
  events: [
    {
      name: 'Hello',
      attributes: { 'effect.fiberId': '#0', 'effect.logLevel': 'INFO' },
      time: [ 1697043230, 280923805 ],
      droppedAttributesCount: 0
    }
  ],
  links: []
}
*/
