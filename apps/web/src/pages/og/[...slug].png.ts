import type { APIRoute } from "astro"
import { getCollection } from "astro:content"
import * as Array from "effect/Array"
import { pipe } from "effect/Function"
import * as Function from "effect/Function"
import * as Option from "effect/Option"
import type { OgTemplateProps } from "@/services/OpenGraph"
import { resolveApiReferenceOpenGraph } from "@/features/api-reference/open-graph"
import {
  createOgAssets,
  renderApiReferenceOg,
  renderBlogOg,
  renderDocsOg,
} from "@/services/OpenGraph"
import { loadOgFonts } from "@/services/OpenGraphFonts"

// On-demand server endpoint: slugs derive from arbitrary page pathnames
// (see BaseLayout.getOgImagePath), so the route cannot be enumerated at build
// time. Run it as a Vercel serverless function instead of a static asset.
export const prerender = false

const notFound = Function.constant(new Response("Not Found", { status: 404 }))

const pngResponse = (imageData: Uint8Array): Response =>
  new Response(new Uint8Array(imageData), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })

const readCategory = (documentPath: string) =>
  pipe(
    documentPath.split("/"),
    (segments) =>
      pipe(
        Array.get(segments, 1),
        Option.filter(() => segments.length >= 3),
        Option.map((segment) => segment.replace(/-/g, " ").toUpperCase()),
      ),
    Option.getOrUndefined,
  )

async function findDoc(documentPath: string) {
  const entryId = documentPath.slice("docs/".length)
  const entries = await getCollection("docs")
  return pipe(
    entries.find(
      (entry) =>
        entry.id === entryId ||
        entry.id === `${entryId}.mdx` ||
        entry.id === `${entryId}/index.mdx`,
    ),
    Option.fromNullishOr,
    Option.map(
      (entry) =>
        ({
          title: entry.data.title,
          subtitle: readCategory(entryId.replace(/\.mdx?$/, "")),
        }) satisfies OgTemplateProps,
    ),
  )
}

async function findBlogPost(documentPath: string) {
  const entryId = documentPath.slice("blog/".length)
  const entries = await getCollection("blog")
  return pipe(
    entries.find((entry) => entry.id === entryId),
    Option.fromNullishOr,
    Option.map(
      (entry) =>
        ({
          title: entry.data.title,
          subtitle: entry.data.excerpt,
        }) satisfies OgTemplateProps,
    ),
  )
}

const staticPngs = import.meta.glob<string>("./_assets/**/*.png", {
  eager: true,
  import: "default",
  query: "?inline",
})

function readStaticPng(imagePath: string): Option.Option<Uint8Array> {
  if (imagePath.includes("..")) {
    return Option.none()
  }

  const dataUri =
    staticPngs[`./_assets/${imagePath}.png`] ??
    staticPngs[`./_assets/${imagePath}/index.png`]
  return pipe(
    dataUri,
    Option.fromNullishOr,
    Option.map((value) =>
      Uint8Array.from(
        Buffer.from(value.slice(value.indexOf(",") + 1), "base64"),
      ),
    ),
  )
}

export const GET: APIRoute = async (context) => {
  const maybeSlug = Option.fromNullishOr(context.params.slug)
  if (Option.isNone(maybeSlug)) {
    return notFound()
  }

  const staticImage = readStaticPng(maybeSlug.value)
  if (Option.isSome(staticImage)) {
    return pngResponse(staticImage.value)
  }

  if (/^docs\/v\d+\/api(?:\/|$)/.test(maybeSlug.value)) {
    const entries = await getCollection("apiReference")
    const card = resolveApiReferenceOpenGraph(
      maybeSlug.value,
      entries.map((entry) => entry.data),
    )
    if (card === undefined) {
      return notFound()
    }
    const ogAssets = createOgAssets(await loadOgFonts(context.url))
    return pngResponse(await renderApiReferenceOg(card.template, ogAssets))
  }

  if (maybeSlug.value.startsWith("docs/")) {
    const ogProps = await findDoc(maybeSlug.value)
    if (Option.isNone(ogProps)) {
      return notFound()
    }
    const ogAssets = createOgAssets(await loadOgFonts(context.url))
    return pngResponse(await renderDocsOg(ogProps.value, ogAssets))
  }

  if (maybeSlug.value.startsWith("blog/")) {
    const ogProps = await findBlogPost(maybeSlug.value)
    if (Option.isNone(ogProps)) {
      return notFound()
    }
    const ogAssets = createOgAssets(await loadOgFonts(context.url))
    return pngResponse(await renderBlogOg(ogProps.value, ogAssets))
  }

  return notFound()
}
