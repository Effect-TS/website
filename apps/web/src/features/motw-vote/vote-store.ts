import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Ref from "effect/Ref"
import type { Tally } from "./domain"

export class VoteStoreError extends Data.TaggedError("VoteStoreError")<{
  readonly cause: unknown
}> {}

interface VoteOutcome extends Tally {
  /** Whether the visitor has a vote on the module after the call. */
  readonly voted: boolean
}

/** Where votes live: Cloudflare D1 when deployed, memory otherwise. */
export class VoteStore extends Context.Service<
  VoteStore,
  {
    /** Every module with votes, most votes first, ties by id. */
    readonly top: () => Effect.Effect<ReadonlyArray<Tally>, VoteStoreError>
    /** The votes one module has. */
    readonly count: (id: string) => Effect.Effect<number, VoteStoreError>
    /** Ids of the modules a visitor has a vote on. */
    readonly votedBy: (
      voter: string,
    ) => Effect.Effect<ReadonlyArray<string>, VoteStoreError>
    /** Adds or removes a visitor's vote on a module. A visitor votes once per module. */
    readonly vote: (
      voter: string,
      id: string,
      on: boolean,
    ) => Effect.Effect<VoteOutcome, VoteStoreError>
  }
>()("website/VoteStore") {}

/** The order of `top`: most votes first, then by id. */
const byRank: Order.Order<Tally> = Order.combine(
  Order.mapInput(Order.Number, ({ votes }: Tally) => -votes),
  Order.mapInput(Order.String, ({ id }: Tally) => id),
)

type Ballots = HashMap.HashMap<string, HashSet.HashSet<string>>

/** Votes held in this process only. For local development and tests. */
export const memoryLayer = Layer.effect(
  VoteStore,
  Effect.gen(function* () {
    const ballots = yield* Ref.make<Ballots>(HashMap.empty())

    const votersOf = (all: Ballots, id: string) =>
      Option.getOrElse(HashMap.get(all, id), () => HashSet.empty<string>())

    const top = Effect.fn("VoteStore.memory.top")(function* () {
      const all = yield* Ref.get(ballots)
      return Arr.sort(
        Arr.fromIterable(HashMap.toEntries(all)).map(([id, voters]) => ({
          id,
          votes: HashSet.size(voters),
        })),
        byRank,
      ).filter(({ votes }) => votes > 0)
    })

    const votedBy = Effect.fn("VoteStore.memory.votedBy")(function* (
      voter: string,
    ) {
      const all = yield* Ref.get(ballots)
      return Arr.sort(
        HashMap.toEntries(all).flatMap(([id, voters]) =>
          HashSet.has(voters, voter) ? [id] : [],
        ),
        Order.String,
      )
    })

    const count = Effect.fn("VoteStore.memory.count")(function* (id: string) {
      return HashSet.size(votersOf(yield* Ref.get(ballots), id))
    })

    const vote = Effect.fn("VoteStore.memory.vote")(function* (
      voter: string,
      id: string,
      on: boolean,
    ) {
      return yield* Ref.modify(ballots, (all) => {
        const voters = votersOf(all, id)
        const next = on
          ? HashSet.add(voters, voter)
          : HashSet.remove(voters, voter)
        return [
          { id, votes: HashSet.size(next), voted: on },
          HashMap.set(all, id, next),
        ]
      })
    })

    return VoteStore.of({ top, count, votedBy, vote })
  }),
)
