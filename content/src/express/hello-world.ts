import { Context, Layer, Effect, Runtime } from "effect"
import express from "express"

// Define Express as a service
const Express = Context.Tag<ReturnType<typeof express>>()

// Define the main route, IndexRouteLive, as a Layer
const IndexRouteLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express)
    const runFork = Runtime.runFork(yield* _(Effect.runtime<never>()))

    app.get("/", (_, res) => {
      runFork(Effect.sync(() => res.send("Hello World!")))
    })
  })
)

// Server Setup
const ServerLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const port = 3001
    const app = yield* _(Express)
    yield* _(
      Effect.acquireRelease(
        Effect.sync(() =>
          app.listen(port, () =>
            console.log(`Example app listening on port ${port}`)
          )
        ),
        (server) => Effect.sync(() => server.close())
      )
    )
  })
)

// Setting Up Express
const ExpressLive = Layer.sync(Express, () => express())

// Combine the layers
const AppLive = ServerLive.pipe(
  Layer.provide(IndexRouteLive),
  Layer.provide(ExpressLive)
)

// Run the program
Effect.runFork(Layer.launch(AppLive))
