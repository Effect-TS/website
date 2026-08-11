import { Effect, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { OpenGraph } from "./Application"
import { OgContentLive } from "./ContentLive"
import { OgRendererLive } from "./RendererLive"

export const OpenGraphLive = OpenGraph.layer.pipe(
  Layer.provide(OgContentLive),
  Layer.provide(OgRendererLive),
)

const OpenGraphMiddleware = HttpRouter.middleware<{
  provides: OpenGraph
}>()(
  Effect.gen(function* () {
    const openGraph = yield* OpenGraph
    return (httpEffect) =>
      Effect.provideService(httpEffect, OpenGraph, openGraph)
  }),
)

export const OpenGraphMiddlewareLive = OpenGraphMiddleware.layer.pipe(
  Layer.provide(OpenGraphLive),
)
