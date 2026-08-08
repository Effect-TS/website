import { createHash } from "node:crypto"

export type CacheKeyPart =
  | boolean
  | number
  | string
  | null
  | ReadonlyArray<CacheKeyPart>

export function createCacheKey(parts: ReadonlyArray<CacheKeyPart>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex")
}
