import { Context, Effect, Layer } from "effect"
import metadata from "virtual:open-graph-metadata"
import { OgNotFound, type OgCard } from "./Model"

export interface OgContentService {
  readonly resolve: (slug: string) => Effect.Effect<OgCard, OgNotFound>
}

export class OgContent extends Context.Service<OgContent, OgContentService>()(
  "website/OgContent",
) {}

export const layer = Layer.succeed(OgContent, {
  resolve: Effect.fn("OgContent.resolve")(function* (slug: string) {
    if (slug.startsWith("docs/")) {
      const entryId = slug.slice("docs/".length)
      const apiReference = metadata.apiReference[entryId]
      if (apiReference !== undefined) {
        return {
          _tag: "ApiReference",
          props: apiReference,
        } satisfies OgCard
      }
      const docs = metadata.docs[entryId]
      if (docs !== undefined) {
        return {
          _tag: "Docs",
          props: docs,
        } satisfies OgCard
      }
    }

    if (slug.startsWith("blog/")) {
      const blog = metadata.blog[slug.slice("blog/".length)]
      if (blog !== undefined) {
        return {
          _tag: "Blog",
          props: blog,
        } satisfies OgCard
      }
    }

    return yield* new OgNotFound({ slug })
  }),
})
