/** A module that can be suggested. */
export interface ModuleRef {
  /** `package/modulePath`, e.g. `effect/cluster/Entity`. Unique across packages. */
  readonly id: string
  /** Import path of the module's folder, e.g. `effect/cluster`. */
  readonly pkg: string
  /** The module's own name, e.g. `Entity`. */
  readonly name: string
}

/** A module on the ranking, with its votes. */
export interface RankedModule extends ModuleRef {
  readonly votes: number
  /** Whether the current visitor has +1'd it. */
  readonly voted: boolean
}

/** Where the build puts the module list the server checks votes against. */
export const VOTE_DATA_PATH = "/module-of-the-week/vote-data.json"

export const VOTE_REFUSALS = [
  "UnknownModule",
  "Covered",
  "RateLimited",
  "InvalidVoter",
  "ChallengeFailed",
] as const

export type VoteRefusal = (typeof VOTE_REFUSALS)[number]

/**
 * Matches for a search, best first: names equal to, starting with, then
 * containing the query, then package matches. Case-insensitive.
 */
export const searchModules = (
  index: ReadonlyArray<ModuleRef>,
  query: string,
  limit = 8,
): ReadonlyArray<ModuleRef> => {
  const q = query.trim().toLowerCase()
  if (q === "") return []
  const rank = ({ name, id }: ModuleRef) => {
    const lower = name.toLowerCase()
    if (lower === q) return 0
    if (lower.startsWith(q)) return 1
    if (lower.includes(q)) return 2
    return id.toLowerCase().includes(q) ? 3 : -1
  }
  return index
    .map((module) => ({ module, rank: rank(module) }))
    .filter(({ rank }) => rank >= 0)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.module.name.length - b.module.name.length ||
        a.module.name.localeCompare(b.module.name),
    )
    .slice(0, limit)
    .map(({ module }) => module)
}
