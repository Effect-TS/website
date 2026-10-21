import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class VoteStoreError extends Data.TaggedError("VoteStoreError")<{
  readonly cause: unknown
}> {}

export interface Tally {
  readonly id: string
  readonly votes: number
}

export interface VoteOutcome extends Tally {
  /** Whether the visitor has a vote on the module after the call. */
  readonly voted: boolean
}

/** Where votes live: Cloudflare D1 when deployed, memory otherwise. */
export class VoteStore extends Context.Service<
  VoteStore,
  {
    /** The modules with most votes first, ties by id. */
    readonly top: () => Effect.Effect<ReadonlyArray<Tally>, VoteStoreError>
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

/** Votes held in this process only. For local development and tests. */
export const memoryLayer = Layer.sync(VoteStore, () => {
  const votes = new Map<string, Set<string>>()

  const countOf = (id: string) => votes.get(id)?.size ?? 0

  return {
    top: () =>
      Effect.sync(() =>
        [...votes.entries()]
          .map(([id, voters]) => ({ id, votes: voters.size }))
          .filter(({ votes }) => votes > 0)
          .sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id)),
      ),

    votedBy: (voter) =>
      Effect.sync(() =>
        [...votes.entries()].flatMap(([id, voters]) =>
          voters.has(voter) ? [id] : [],
        ),
      ),

    vote: (voter, id, on) =>
      Effect.sync(() => {
        const voters = votes.get(id) ?? new Set<string>()
        if (on) voters.add(voter)
        else voters.delete(voter)
        votes.set(id, voters)
        return { id, votes: countOf(id), voted: voters.has(voter) }
      }),
  }
})
