import { D1Client } from "@effect/sql-d1/D1Client"
import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as SqlSchema from "effect/sql/SqlSchema"
import type * as Statement from "effect/sql/Statement"
import { Tally, type VoteOutcome } from "./domain"

const byRank: Order.Order<Tally> = Order.combine(
  Order.mapInput(Order.Number, ({ votes }: Tally) => -votes),
  Order.mapInput(Order.String, ({ id }: Tally) => id),
)

type Ballots = HashMap.HashMap<string, HashSet.HashSet<string>>

const IdRow = Schema.Struct({ id: Schema.String })
const CountRow = Schema.Struct({ votes: Schema.Number })

const decodeCount = Schema.decodeUnknownEffect(Schema.NonEmptyArray(CountRow))

/** A visitor votes once per module. Storage failures are defects. */
export class VoteStore extends Context.Service<
  VoteStore,
  {
    /** Every module with votes, most votes first, ties by id. */
    readonly top: Effect.Effect<ReadonlyArray<Tally>>
    readonly count: (id: string) => Effect.Effect<number>
    readonly votedBy: (voter: string) => Effect.Effect<ReadonlyArray<string>>
    readonly add: (voter: string, id: string) => Effect.Effect<VoteOutcome>
    readonly remove: (voter: string, id: string) => Effect.Effect<VoteOutcome>
  }
>()("website/VoteStore") {
  static readonly layerMemory = Layer.effect(
    this,
    Effect.gen(function* () {
      const ballots = yield* Ref.make<Ballots>(HashMap.empty())

      const votersOf = (all: Ballots, id: string) =>
        Option.getOrElse(HashMap.get(all, id), () => HashSet.empty<string>())

      const top = Ref.get(ballots).pipe(
        Effect.map((all) =>
          Arr.sort(
            Arr.fromIterable(HashMap.toEntries(all)).map(([id, voters]) => ({
              id,
              votes: HashSet.size(voters),
            })),
            byRank,
          ).filter(({ votes }) => votes > 0),
        ),
      )

      const votedBy = (voter: string) =>
        Ref.get(ballots).pipe(
          Effect.map((all) =>
            Arr.sort(
              HashMap.toEntries(all).flatMap(([id, voters]) =>
                HashSet.has(voters, voter) ? [id] : [],
              ),
              Order.String,
            ),
          ),
        )

      const count = (id: string) =>
        Effect.map(Ref.get(ballots), (all) => HashSet.size(votersOf(all, id)))

      const settle = (voter: string, id: string, voted: boolean) =>
        Ref.modify(ballots, (all): [VoteOutcome, Ballots] => {
          const voters = votersOf(all, id)
          const next = voted
            ? HashSet.add(voters, voter)
            : HashSet.remove(voters, voter)
          return [
            { id, votes: HashSet.size(next), voted },
            HashMap.set(all, id, next),
          ]
        })

      return VoteStore.of({
        top,
        count,
        votedBy,
        add: (voter, id) => settle(voter, id, true),
        remove: (voter, id) => settle(voter, id, false),
      })
    }),
  )

  static readonly layerD1: Layer.Layer<VoteStore, never, D1Client> =
    Layer.effect(
      this,
      Effect.gen(function* () {
        const sql = yield* D1Client

        const top = SqlSchema.findAll({
          Request: Schema.Void,
          Result: Tally,
          execute: () => sql`
            SELECT module_id AS id, votes
            FROM tallies
            WHERE votes > 0
            ORDER BY votes DESC, module_id ASC`,
        })

        const count = SqlSchema.findOneOption({
          Request: Schema.String,
          Result: CountRow,
          execute: (id) =>
            sql`SELECT votes FROM tallies WHERE module_id = ${id}`,
        })

        const votedBy = SqlSchema.findAll({
          Request: Schema.String,
          Result: IdRow,
          execute: (voter) => sql`
            SELECT module_id AS id
            FROM votes
            WHERE voter_id = ${voter}
            ORDER BY module_id ASC`,
        })

        const settle = (
          id: string,
          voted: boolean,
          write: Statement.Statement<unknown>,
        ) =>
          sql
            .batch([
              write,
              sql`
                INSERT INTO tallies (module_id, votes)
                VALUES (
                  ${id},
                  (SELECT COUNT(*) FROM votes WHERE module_id = ${id})
                )
                ON CONFLICT (module_id) DO UPDATE SET votes = excluded.votes`,
              sql`SELECT votes FROM tallies WHERE module_id = ${id}`,
            ])
            .pipe(
              Effect.flatMap(([, , counted]) => decodeCount(counted)),
              Effect.map(([{ votes }]) => ({ id, votes, voted })),
            )

        const add = Effect.fn("VoteStore.add")(function* (
          voter: string,
          id: string,
        ) {
          const now = yield* Clock.currentTimeMillis
          return yield* settle(
            id,
            true,
            sql`
              INSERT INTO votes (module_id, voter_id, created_at)
              VALUES (${id}, ${voter}, ${now})
              ON CONFLICT (module_id, voter_id) DO NOTHING`,
          )
        }, Effect.orDie)

        const remove = Effect.fn("VoteStore.remove")(function* (
          voter: string,
          id: string,
        ) {
          return yield* settle(
            id,
            false,
            sql`
              DELETE FROM votes
              WHERE module_id = ${id} AND voter_id = ${voter}`,
          )
        }, Effect.orDie)

        return VoteStore.of({
          top: Effect.orDie(top()),
          count: (id) =>
            count(id).pipe(
              Effect.map(
                Option.match({
                  onNone: () => 0,
                  onSome: ({ votes }) => votes,
                }),
              ),
              Effect.orDie,
            ),
          votedBy: (voter) =>
            votedBy(voter).pipe(
              Effect.map((rows) => rows.map(({ id }) => id)),
              Effect.orDie,
            ),
          add,
          remove,
        })
      }),
    )
}
