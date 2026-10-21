import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ModuleCatalog, memoized } from "./catalog"
import { getVoteData } from "./vote-data"

/**
 * The catalog straight from the content collections, for `astro dev`, which
 * has no build output to read. Only `server.ts` imports this file, and only
 * in development, so a build leaves `astro:content` out of the Worker.
 */
export const layer: Layer.Layer<ModuleCatalog> = Layer.effect(
  ModuleCatalog,
  memoized(Effect.tryPromise(getVoteData)),
)
