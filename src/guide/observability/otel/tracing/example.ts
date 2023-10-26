import { Effect } from "effect"
import { NodeSdk } from "@effect/opentelemetry"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

// Function to simulate a task with possible subtasks
const task = (
  name: string,
  delay: number,
  children: ReadonlyArray<Effect.Effect<never, never, void>> = []
) =>
  Effect.gen(function* (_) {
    yield* _(Effect.log(name))
    yield* _(Effect.sleep(`${delay} millis`))
    for (const child of children) {
      yield* _(child)
    }
    yield* _(Effect.sleep(`${delay} millis`))
  }).pipe(Effect.withSpan(name))

const poll = task("/poll", 1)

// Create a program with tasks and subtasks
const program = task("client", 2, [
  task("/api", 3, [
    task("/authN", 4, [task("/authZ", 5)]),
    task("/payment Gateway", 6, [task("DB", 7), task("Ext. Merchant", 8)]),
    task("/dispatch", 9, [
      task("/dispatch/search", 10),
      Effect.all([poll, poll, poll], { concurrency: "inherit" }),
      task("/pollDriver/{id}", 11)
    ])
  ])
])

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "example" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter())
}))

Effect.runPromise(
  program.pipe(
    Effect.provide(NodeSdkLive),
    Effect.catchAllCause(Effect.logError)
  )
)
/*
Output:
timestamp=... level=INFO fiber=#0 message=client
timestamp=... level=INFO fiber=#0 message=/api
timestamp=... level=INFO fiber=#0 message=/authN
timestamp=... level=INFO fiber=#0 message=/authZ
timestamp=... level=INFO fiber=#0 message="/payment Gateway"
timestamp=... level=INFO fiber=#0 message=DB
timestamp=... level=INFO fiber=#0 message="Ext. Merchant"
timestamp=... level=INFO fiber=#0 message=/dispatch
timestamp=... level=INFO fiber=#0 message=/dispatch/search
timestamp=... level=INFO fiber=#3 message=/poll
timestamp=... level=INFO fiber=#4 message=/poll
timestamp=... level=INFO fiber=#5 message=/poll
timestamp=... level=INFO fiber=#0 message=/pollDriver/{id}
*/
