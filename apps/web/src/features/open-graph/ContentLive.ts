import { getCollection } from "astro:content"
import { Effect, Layer } from "effect"
import { resolveApiReferenceOpenGraph } from "@/features/api-reference/open-graph"
import { OgContent } from "./Content"
import { OgContentError, OgNotFound, type OgCard } from "./Model"

const staticPngs = import.meta.glob<string>("../../pages/og/_assets/**/*.png", {
  eager: true,
  import: "default",
  query: "?inline",
})

const readStaticPng = (imagePath: string): Uint8Array | undefined => {
  if (imagePath.includes("..")) {
    return undefined
  }

  const dataUri =
    staticPngs[`../../pages/og/_assets/${imagePath}.png`] ??
    staticPngs[`../../pages/og/_assets/${imagePath}/index.png`]

  return dataUri === undefined
    ? undefined
    : Uint8Array.from(
        Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64"),
      )
}

const readCategory = (entryId: string): string | undefined => {
  const segments = entryId.replace(/\.mdx?$/, "").split("/")
  return segments.length >= 3
    ? segments[1]?.replace(/-/g, " ").toUpperCase()
    : undefined
}

const tryCollection = <A>(slug: string, load: () => Promise<A>) =>
  Effect.tryPromise({
    try: load,
    catch: (cause) => new OgContentError({ slug, cause }),
  })

export const OgContentLive = Layer.succeed(OgContent, {
  resolve: Effect.fn("OgContent.resolve")(function* (slug: string) {
    const staticImage = readStaticPng(slug)
    if (staticImage !== undefined) {
      return { _tag: "Static", bytes: staticImage } satisfies OgCard
    }

    if (/^docs\/v\d+\/api(?:\/|$)/.test(slug)) {
      const entries = yield* tryCollection(slug, () =>
        getCollection("apiReference"),
      )
      const card = resolveApiReferenceOpenGraph(
        slug,
        entries.map((entry) => entry.data),
      )
      if (card === undefined) {
        return yield* new OgNotFound({ slug })
      }
      return {
        _tag: "ApiReference",
        props: card.template,
      } satisfies OgCard
    }

    if (slug.startsWith("docs/")) {
      const entryId = slug.slice("docs/".length)
      const entries = yield* tryCollection(slug, () => getCollection("docs"))
      const entry = entries.find(
        (candidate) =>
          candidate.id === entryId ||
          candidate.id === `${entryId}.mdx` ||
          candidate.id === `${entryId}/index.mdx`,
      )
      if (entry === undefined) {
        return yield* new OgNotFound({ slug })
      }
      return {
        _tag: "Docs",
        props: {
          title: entry.data.title,
          subtitle: readCategory(entryId),
        },
      } satisfies OgCard
    }

    if (slug.startsWith("blog/")) {
      const entryId = slug.slice("blog/".length)
      const entries = yield* tryCollection(slug, () => getCollection("blog"))
      const entry = entries.find((candidate) => candidate.id === entryId)
      if (entry === undefined) {
        return yield* new OgNotFound({ slug })
      }
      return {
        _tag: "Blog",
        props: {
          title: entry.data.title,
          subtitle: entry.data.excerpt,
        },
      } satisfies OgCard
    }

    return yield* new OgNotFound({ slug })
  }),
})
