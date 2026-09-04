import Metadata from "virtual:open-graph-metadata"
import type { OpenGraphError } from "@website/open-graph/OpenGraph"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as OpenGraphRenderer from "./renderer"
import { OpenGraphContent, MetadataNotFound } from "./model"

export class OpenGraphGenerator extends Context.Service<
  OpenGraphGenerator,
  {
    readonly generate: (
      slug: string,
      requestUrl: URL,
    ) => Effect.Effect<
      Uint8Array<ArrayBufferLike>,
      MetadataNotFound | OpenGraphError
    >
  }
>()("website/OpenGraphGenerator") {}

const API_DOCS_REGEX = /^docs\/v[34]\/api/

export const make = Effect.gen(function* () {
  const renderer = yield* OpenGraphRenderer.OpenGraphRenderer

  const resolveContent = Effect.fn("OpenGraphGenerator.resolveContent")(
    function* (slug: string) {
      if (slug === "play") {
        return OpenGraphContent.Docs({
          props: { title: "Effect Playground" },
        })
      }

      if (API_DOCS_REGEX.test(slug)) {
        const entryId = slug.slice("docs/".length)
        const metadata = Metadata.apiReference[entryId]
        if (metadata !== undefined) {
          return OpenGraphContent.Api({ props: metadata })
        }
      }

      if (slug.startsWith("docs/")) {
        const entryId = slug.slice("docs/".length)
        const metadata = Metadata.docs[entryId]
        if (metadata !== undefined) {
          return OpenGraphContent.Docs({ props: metadata })
        }
      }

      if (slug.startsWith("blog/")) {
        const entryId = slug.slice("blog/".length)
        const metadata = Metadata.blog[entryId]
        if (metadata !== undefined) {
          return OpenGraphContent.Blog({ props: metadata })
        }
      }

      return yield* new MetadataNotFound({ slug })
    },
  )

  const generate = Effect.fn("OpenGraphGenerator.generate")(function* (
    slug: string,
    requestUrl: URL,
  ) {
    const content = yield* resolveContent(slug)
    return yield* renderer.render(content, requestUrl)
  })

  return { generate } as const
})

export const layer = Layer.effect(OpenGraphGenerator, make).pipe(
  Layer.provide(OpenGraphRenderer.layer),
)
