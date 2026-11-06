import openGraphRendererVersion from "virtual:open-graph-renderer-version"

export interface OpenGraphImageMetadata {
  readonly title: string
  readonly description?: string | undefined
  readonly ogImageVersion?: string | undefined
}

/**
 * Path of the Open Graph image for the page at `pathname`, as advertised by
 * that page's `og:image`. Pass the metadata the page gives its layout so other
 * pages that show the image request the same URL.
 *
 * `v` makes the image immutable at the edge, so it must change whenever the
 * image does. The image is drawn from the page's own metadata (covered by its
 * title, description and `ogImageVersion`) and the renderer. Never key it on
 * the deploy revision: that changes every prerendered page on every commit,
 * which defeats the incremental build and re-uploads every HTML asset.
 */
export const openGraphImagePath = async (
  pathname: string,
  { title, description, ogImageVersion }: OpenGraphImageMetadata,
): Promise<string> => {
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "") || "index"
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        openGraphRendererVersion,
        title,
        description ?? null,
        ogImageVersion ?? null,
      ]),
    ),
  )
  const version = Array.from(new Uint8Array(digest).slice(0, 8), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
  return `/og/${slug}.png?v=${version}`
}
