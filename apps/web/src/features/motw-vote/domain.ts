import * as Array from "effect/Array"
import { pipe } from "effect/Function"
import * as Order from "effect/Order"
import * as Result from "effect/Result"
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

/** `effect/cluster/Entity` is package `effect`, folder `cluster`, name `Entity`. */
export const toModuleRef =
  (packages: Readonly<Record<string, string>>) =>
  (id: string): ModuleRef => {
    const [slug = "", ...path] = id.split("/")
    return {
      id,
      pkg: [packages[slug] ?? slug, ...path.slice(0, -1)].join("/"),
      name: path.at(-1) ?? slug,
    }
  }

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

interface Match {
  readonly module: ModuleRef
  readonly rank: number
}

const byRank = Order.combineAll<Match>([
  Order.mapInput(Order.Number, ({ rank }) => rank),
  Order.mapInput(Order.Number, ({ module }) => module.name.length),
  Order.mapInput(Order.String, ({ module }) => module.name),
])

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
  const rank = ({ name, id }: ModuleRef): Result.Result<number, void> => {
    const lower = name.toLowerCase()
    if (lower === q) return Result.succeed(0)
    if (lower.startsWith(q)) return Result.succeed(1)
    if (lower.includes(q)) return Result.succeed(2)
    return id.toLowerCase().includes(q) ? Result.succeed(3) : Result.failVoid
  }
  return pipe(
    index,
    Array.filterMap((module) =>
      Result.map(rank(module), (rank): Match => ({ module, rank })),
    ),
    Array.sort(byRank),
    Array.take(limit),
    Array.map(({ module }) => module),
  )
}
