import { Effect, Layer } from "effect"
import {
  createOgAssets,
  renderApiReferenceOg,
  renderBlogOg,
  renderDocsOg,
} from "@/services/OpenGraph"
import { OgFonts } from "./Fonts"
import { OgFontsLive } from "./FontsLive"
import { OgRenderError, type OgCard } from "./Model"
import { OgRenderer } from "./Renderer"

type DynamicOgCard = Exclude<OgCard, { readonly _tag: "Static" }>

export const OgRendererLive = Layer.effect(
  OgRenderer,
  Effect.gen(function* () {
    const fonts = yield* OgFonts

    const render = Effect.fn("OgRenderer.render")(function* (
      card: DynamicOgCard,
      requestUrl: URL,
    ) {
      const assets = createOgAssets(yield* fonts.load(requestUrl))
      return yield* Effect.tryPromise({
        try: () => {
          switch (card._tag) {
            case "ApiReference":
              return renderApiReferenceOg(card.props, assets)
            case "Blog":
              return renderBlogOg(card.props, assets)
            case "Docs":
              return renderDocsOg(card.props, assets)
          }
        },
        catch: (cause) => new OgRenderError({ template: card._tag, cause }),
      })
    })

    return { render } as const
  }),
).pipe(Layer.provide(OgFontsLive))
