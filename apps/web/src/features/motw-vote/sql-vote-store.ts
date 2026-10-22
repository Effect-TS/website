import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SqlSchema from "effect/sql/SqlSchema"
import { D1Client } from "@effect/sql-d1/D1Client"
import { Tally } from "./domain"
import { VoteStore, VoteStoreError } from "./vote-store"

const IdRow = Schema.Struct({ id: Schema.String })
const CountRow = Schema.Struct({ votes: Schema.Number })
const FoundRow = Schema.Struct({ found: Schema.Number })

const decodeFound = Schema.decodeUnknownEffect(Schema.Array(FoundRow))
const decodeCount = Schema.decodeUnknownEffect(Schema.NonEmptyArray(CountRow))

const toStoreError = Effect.mapError(
  (cause: unknown) => new VoteStoreError({ cause }),
)

/** Votes in Cloudflare D1, or any SQLite reachable through a `D1Client`. */
export const layer: Layer.Layer<VoteStore, never, D1Client> = Layer.effect(
  VoteStore,
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
      execute: (id) => sql`SELECT votes FROM tallies WHERE module_id = ${id}`,
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

    const vote = Effect.fn("VoteStore.sql.vote")(function* (
      voter: string,
      id: string,
      on: boolean,
    ) {
      const now = yield* Clock.currentTimeMillis
      const write = on
        ? sql`
            INSERT INTO votes (module_id, voter_id, created_at)
            VALUES (${id}, ${voter}, ${now})
            ON CONFLICT (module_id, voter_id) DO NOTHING`
        : sql`
            DELETE FROM votes
            WHERE module_id = ${id} AND voter_id = ${voter}`
      const [, , found, counted] = yield* sql.batch([
        write,
        sql`
          INSERT INTO tallies (module_id, votes)
          VALUES (
            ${id},
            (SELECT COUNT(*) FROM votes WHERE module_id = ${id})
          )
          ON CONFLICT (module_id) DO UPDATE SET votes = excluded.votes`,
        sql`
          SELECT 1 AS found
          FROM votes
          WHERE module_id = ${id} AND voter_id = ${voter}`,
        sql`SELECT votes FROM tallies WHERE module_id = ${id}`,
      ])
      const [hasVoted, [tally]] = yield* Effect.all([
        decodeFound(found),
        decodeCount(counted),
      ])
      return { id, votes: tally.votes, voted: hasVoted.length > 0 }
    }, toStoreError)

    return VoteStore.of({
      top: () => top().pipe(toStoreError),
      count: (id) =>
        count(id).pipe(
          Effect.map((row) =>
            Option.match(row, {
              onNone: () => 0,
              onSome: ({ votes }) => votes,
            }),
          ),
          toStoreError,
        ),
      votedBy: (voter) =>
        votedBy(voter).pipe(
          Effect.map((rows) => rows.map(({ id }) => id)),
          toStoreError,
        ),
      vote,
    })
  }),
)
