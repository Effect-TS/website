import { createHash } from "node:crypto"

/**
 * Helpers for the `cacheKey` returned by `getStaticPaths()` under
 * `experimental.incrementalBuild`.
 *
 * Astro skips re-rendering a path when its `cacheKey` and the hash of its route's
 * module dependency graph both match the previous build. The module hash covers
 * code — templates, layouts, components, imported assets — so a `cacheKey` only
 * has to cover *data* the page renders: its own content entry plus anything it
 * reads about sibling entries, referenced collections, or files on disk.
 *
 * Under-keying is silent: the page keeps its stale output with no error. Prefer
 * hashing a little more than a page strictly needs over guessing narrow.
 */

/**
 * Stable digest of build-time data that Astro's module dependency hash cannot
 * see.
 *
 * Never pass a value through `String()` on the way in — objects collapse to
 * "[object Object]" and silently defeat invalidation. `Map`, `Set` and `Date`
 * do not survive `JSON.stringify` usefully either; convert them to plain arrays
 * (sorted, so the digest does not depend on iteration order) first.
 */
export function digest(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value)
  return createHash("sha256").update(input).digest("hex").slice(0, 16)
}

/**
 * Join digest fragments into a `getStaticPaths` cache key. `undefined` parts
 * become `-` so a missing fragment stays distinguishable from an empty one.
 */
export const cacheKey = (
  ...parts: ReadonlyArray<string | number | undefined>
): string => parts.map((part) => part ?? "-").join(":")

/**
 * Serialise rows and sort them, so a digest never depends on collection
 * iteration order. Use this for any list of records fed to {@link digest}.
 */
export const sortedRows = (rows: ReadonlyArray<unknown>): Array<string> =>
  rows
    .map((row) => JSON.stringify(row))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
