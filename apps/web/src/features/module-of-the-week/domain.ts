import type { CollectionEntry } from "astro:content"
import * as Data from "effect/Data"

export const INTRO_ID = "module-of-the-week"
export const MODULE_PREFIX = `${INTRO_ID}/`

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

export class ModuleNotFound extends Data.TaggedError("ModuleNotFound")<{
  readonly ref: number | string
}> {}
