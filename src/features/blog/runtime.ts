/**
 * Import direction for this feature:
 *
 *   collection.ts ──────────────► (only) src/content.config.ts
 *   domain.ts ◄── repository.ts ◄── queries.ts ◄── runtime.ts ◄── *.astro / rss.xml.ts
 *                     ▲                                │
 *                     └── repository.astro.ts ─────────┘ → astro:content
 *   domain.ts ◄── components/BlogAtoms.ts ◄── components/*.tsx
 *
 * `astro:content` is a Vite virtual module plain vitest cannot resolve.
 * Exactly two files may import it at runtime: `collection.ts` and
 * `repository.astro.ts`. This file is the only bridge `.astro` files and
 * route handlers use to reach `BlogQueries`.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { BlogQueries } from "./queries"
import { layerAstroContent } from "./repository.astro"

const BlogLayer = BlogQueries.layer.pipe(Layer.provide(layerAstroContent))

export const runBlog = <A, E>(effect: Effect.Effect<A, E, BlogQueries>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provide(BlogLayer), Effect.tapCause(Effect.logError)))
