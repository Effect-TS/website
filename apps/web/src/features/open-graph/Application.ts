import { Context, Effect, Layer } from "effect"
import { OgContent, layer as contentLayer } from "./Content"
import { OgRenderer, layer as rendererLayer } from "./Renderer"

export class OpenGraph extends Context.Service<OpenGraph>()(
  "website/OpenGraph",
  {
    make: Effect.gen(function* () {
      const content = yield* OgContent
      const renderer = yield* OgRenderer

      const generate = Effect.fn("OpenGraph.generate")(function* (
        slug: string,
        requestUrl: URL,
      ) {
        const card = yield* content.resolve(slug)
        return yield* renderer.render(card, requestUrl)
      })

      return { generate } as const
    }),
  },
) {}

export const layer = Layer.effect(OpenGraph, OpenGraph.make).pipe(
  Layer.provide(contentLayer),
  Layer.provide(rendererLayer),
)
