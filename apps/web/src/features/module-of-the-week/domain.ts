import type { CollectionEntry } from "astro:content"
import * as Data from "effect/Data"

export const INTRO_ID = "module-of-the-week"
export const MODULE_PREFIX = `${INTRO_ID}/`

/** RSS feed of the series, for `<link rel="alternate">` autodiscovery. */
export const MODULE_FEED = {
  title: "Effect Module of the Week",
  href: "/module-of-the-week/rss.xml",
} as const

/** A post title without its "Module of the Week - " prefix. */
export const withoutPrefix = (title: string): string =>
  title.replace(/^Module of the Week\s*-\s*/, "")

export type ModulePost = CollectionEntry<"blog">

export interface Module {
  readonly post: ModulePost
  /** Position in the series: the first module is 1. */
  readonly number: number
  /** Post title without the "Module of the Week - " prefix. */
  readonly title: string
}

export class ModuleContentError extends Data.TaggedError("ModuleContentError")<{
  readonly cause: unknown
}> {}
