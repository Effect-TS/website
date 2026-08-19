import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as OpenGraph from "@website/open-graph/OpenGraph"
import {
  createApiReferenceOgNode,
  createBlogOgNode,
  createDocsOgNode,
} from "@/services/OpenGraph"
import { OPENGRAPH_IMAGE_HEIGHT, OPENGRAPH_IMAGE_WIDTH } from "@/lib/open-graph"
import type { OgCard } from "./Model"

export interface OgRendererService {
  readonly render: (
    card: OgCard,
    requestUrl: URL,
  ) => Effect.Effect<Uint8Array, OpenGraph.OpenGraphError>
}

export class OgRenderer extends Context.Service<
  OgRenderer,
  OgRendererService
>()("website/OgRenderer") {}

export const layer = Layer.effect(
  OgRenderer,
  Effect.gen(function* () {
    const openGraph = yield* OpenGraph.OpenGraph

    const render = Effect.fn("OgRenderer.render")(function* (
      card: OgCard,
      requestUrl: URL,
    ) {
      const node = (() => {
        switch (card._tag) {
          case "ApiReference":
            return createApiReferenceOgNode(card.props)
          case "Blog":
            return createBlogOgNode(card.props)
          case "Docs":
            return createDocsOgNode(card.props)
        }
      })()

      return yield* openGraph.render({
        node,
        assetOrigin: requestUrl,
        width: OPENGRAPH_IMAGE_WIDTH,
        height: OPENGRAPH_IMAGE_HEIGHT,
        resvg: {
          fitTo: { mode: "width", value: OPENGRAPH_IMAGE_WIDTH },
        },
      })
    })

    return { render }
  }),
).pipe(Layer.provide(OpenGraph.layer))
