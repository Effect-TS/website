import { Effect } from "effect"
import { NodeSdk } from "@effect/opentelemetry"
import {
  ConsoleSpanExporter,
  BatchSpanProcessor
} from "@opentelemetry/sdk-trace-base"

const program = Effect.fail("Oh no!").pipe(
  Effect.delay("100 millis"),
  Effect.withSpan("myspan")
)

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "example" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter())
}))

Effect.runPromise(program.pipe(Effect.provide(NodeSdkLive))).then(
  console.log,
  console.error
)
/*
Example Output:
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
{
  _id: 'FiberFailure',
  cause: { _id: 'Cause', _tag: 'Fail', failure: 'Oh no!' }
}
*/
