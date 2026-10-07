import type { GetStaticPaths } from "astro"

import {
  loadChangelogSummaries,
  summariesDigest,
} from "@/features/changelog/overview"

export const prerender = true

/**
 * Latest release of the `effect` package, read by the navbar version popover.
 * The navbar is part of every docs page, so it fetches this file instead of
 * rendering the version: otherwise each Effect release would change every page.
 */
export const getStaticPaths = (async () => {
  const summaries = (await loadChangelogSummaries()).filter(
    ({ slug }) => slug === "effect",
  )
  return summaries.map((summary) => ({
    params: { version: summary.channel },
    cacheKey: summariesDigest([summary]),
    props: {
      date: summary.latestDate,
      package: summary.name,
      version: summary.latestVersion,
    },
  }))
}) satisfies GetStaticPaths

export function GET({
  props,
}: {
  readonly props: {
    readonly date: string | undefined
    readonly package: string
    readonly version: string
  }
}) {
  return Response.json({ ...props })
}
