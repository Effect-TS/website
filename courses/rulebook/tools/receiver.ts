// The local HTTP receiver the course's rules talk to. You never edit it.
//
//   pnpm receiver                   listen on http://localhost:4600
//   pnpm receiver --port 4700       another port
//   pnpm receiver --scenario mixed  also print the lesson 21 scenario
//
// Endpoints (any method unless noted):
//   /ok                 200
//   /slow?ms=2000       200 after the delay
//   /fail?status=500    the requested status, 400 to 599
//   /flaky              500, 200, 500, 200, ...
//   GET /status         {"status":"ok"}, {"status":"degraded"}, or a 500
//   POST /status/mode   body {"mode":"ok"|"degraded"|"error"} switches /status
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Layer, Option, Path, Schema } from "effect"
import { Command, Flag } from "effect/cli"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { createServer } from "node:http"
import { isMain } from "./entrypoint.ts"

export const defaultPort = 4600

export const StatusMode = Schema.Literals(["ok", "degraded", "error"])
export type StatusMode = typeof StatusMode.Type

const SlowParams = Schema.Struct({
  ms: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: 600_000 }))
  )
})

const FailParams = Schema.Struct({
  status: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 400, maximum: 599 }))
  )
})

const ModeBody = Schema.Struct({ mode: StatusMode })

const badRequest = (error: Schema.SchemaError) =>
  Effect.succeed(HttpServerResponse.jsonUnsafe({ error: error.message }, { status: 400 }))

const routes = HttpRouter.use(Effect.fn(function*(router) {
  // Per receiver instance, so each test and each run starts fresh.
  let flakyCalls = 0
  let mode: StatusMode = "ok"

  yield* router.add("*", "/ok", HttpServerResponse.jsonUnsafe({ ok: true }))

  yield* router.add(
    "*",
    "/slow",
    Effect.gen(function*() {
      const { ms = 1000 } = yield* HttpServerRequest.schemaSearchParams(SlowParams)
      yield* Effect.sleep(ms)
      return HttpServerResponse.jsonUnsafe({ ok: true, ms })
    }).pipe(Effect.catchTag("SchemaError", badRequest))
  )

  yield* router.add(
    "*",
    "/fail",
    Effect.gen(function*() {
      const { status = 500 } = yield* HttpServerRequest.schemaSearchParams(FailParams)
      return HttpServerResponse.jsonUnsafe({ error: `failed with ${status} as requested` }, { status })
    }).pipe(Effect.catchTag("SchemaError", badRequest))
  )

  yield* router.add(
    "*",
    "/flaky",
    Effect.sync(() => {
      flakyCalls++
      return flakyCalls % 2 === 1
        ? HttpServerResponse.jsonUnsafe({ error: "flaky failure" }, { status: 500 })
        : HttpServerResponse.jsonUnsafe({ ok: true })
    })
  )

  yield* router.add(
    "GET",
    "/status",
    Effect.sync(() =>
      mode === "error"
        ? HttpServerResponse.jsonUnsafe({ status: "error" }, { status: 500 })
        : HttpServerResponse.jsonUnsafe({ status: mode })
    )
  )

  yield* router.add(
    "POST",
    "/status/mode",
    Effect.gen(function*() {
      const body = yield* HttpServerRequest.schemaBodyJson(ModeBody)
      mode = body.mode
      yield* Effect.log(`/status is now ${mode}`)
      return HttpServerResponse.jsonUnsafe({ mode })
    }).pipe(
      Effect.catchTags({
        SchemaError: badRequest,
        HttpServerError: () =>
          Effect.succeed(HttpServerResponse.jsonUnsafe({ error: "expected a JSON body" }, { status: 400 }))
      })
    )
  )
}))

// The receiver's routes served on whatever `HttpServer` is provided.
export const layer = HttpRouter.serve(routes)

const MixedRule = Schema.fromJsonString(Schema.Struct({
  name: Schema.String,
  action: Schema.Struct({ url: Schema.String })
}))

// Lesson 21 and 22: list the rules of the mixed scenario and what each one
// should produce, so the receiver's log can be read alongside `runs list`.
const printMixedScenario = Effect.fn("printMixedScenario")(function*(port: number) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const directory = path.join(import.meta.dirname, "..", "fixtures", "rules", "mixed")
  const files = (yield* fs.readDirectory(directory)).filter((file) => file.endsWith(".json")).toSorted()
  yield* Console.log("Scenario mixed: four rules on one expense event")
  for (const file of files) {
    const rule = yield* fs.readFileString(path.join(directory, file)).pipe(
      Effect.flatMap(Schema.decodeEffect(MixedRule))
    )
    const url = new URL(rule.action.url)
    if (Number(url.port) !== port) {
      yield* Console.log(`  warning: ${file} posts to port ${url.port}, the receiver listens on ${port}`)
    }
    yield* Console.log(`  ${rule.name.padEnd(28)} POST ${url.pathname}${url.search}  ${expectation(url)}`)
  }
  yield* Console.log(
    "Add them with `pnpm cli rules add fixtures/rules/mixed/<file>`, then `pnpm cli events submit fixtures/events/laptop.json`."
  )
})

const expectation = (url: URL) => {
  switch (url.pathname) {
    case "/ok":
      return "succeeds"
    case "/slow":
      return `answers after ${Number(url.searchParams.get("ms")) / 1000} s, past the run timeout`
    case "/fail":
      return `fails with ${url.searchParams.get("status") ?? 500}`
    default:
      return ""
  }
}

export const command = Command.make(
  "receiver",
  {
    port: Flag.Int("port").pipe(
      Flag.withDescription("Port to listen on"),
      Flag.withDefault(defaultPort)
    ),
    scenario: Flag.Literals("scenario", ["mixed"]).pipe(
      Flag.withDescription("Print the rules of a lesson scenario before serving"),
      Flag.optional
    )
  },
  Effect.fn(function*({ port, scenario }) {
    if (Option.isSome(scenario)) {
      yield* printMixedScenario(port)
    }
    yield* Console.log(`Receiver on http://localhost:${port}: /ok /slow?ms= /fail?status= /flaky /status`)
    return yield* Layer.launch(layer.pipe(Layer.provide(NodeHttpServer.layer(createServer, { port }))))
  })
).pipe(Command.withDescription("Local HTTP receiver for the rulebook course"))

if (isMain(import.meta)) {
  command.pipe(
    Command.run({ version: "0.0.0" }),
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
