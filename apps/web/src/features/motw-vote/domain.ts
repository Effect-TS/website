import * as Schema from "effect/Schema"

export const ModuleRef = Schema.Struct({
  /** `package/modulePath`, e.g. `effect/cluster/Entity`. Unique across packages. */
  id: Schema.String,
  /** Import path of the module's folder, e.g. `effect/cluster`. */
  pkg: Schema.String,
  name: Schema.String,
})

export type ModuleRef = typeof ModuleRef.Type

export const Tally = Schema.Struct({
  id: Schema.String,
  votes: Schema.Number,
})

export type Tally = typeof Tally.Type

/** A tally and whether the visitor has a vote on the module afterwards. */
export const VoteOutcome = Schema.Struct({
  ...Tally.fields,
  voted: Schema.Boolean,
})

export type VoteOutcome = typeof VoteOutcome.Type

export type RankedModule = ModuleRef & Omit<VoteOutcome, "id">

export const VoteRefusal = Schema.Literals([
  "UnknownModule",
  "Covered",
  "RateLimited",
  "ChallengeFailed",
])

export type VoteRefusal = typeof VoteRefusal.Type

export class VoteRefusedError extends Schema.TaggedError<VoteRefusedError>()(
  "VoteRefusedError",
  { reason: VoteRefusal },
  { httpApiStatus: 409 },
) {}

export const VOTE_DATA_PATH = "/module-of-the-week/vote-data.json"

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
