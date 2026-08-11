import { Context, Effect, Layer } from "effect"
import { OgContent } from "./Content"
import { OgRenderer } from "./Renderer"

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
        return card._tag === "Static"
          ? card.bytes
          : yield* renderer.render(card, requestUrl)
      })

      return { generate } as const
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make)
}
