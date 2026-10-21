import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { VoteStore, VoteStoreError } from "./vote-store"

/** The part of a Cloudflare `D1Database` this store uses. */
export interface D1Database {
  readonly prepare: (query: string) => D1PreparedStatement
  readonly batch: (
    statements: ReadonlyArray<D1PreparedStatement>,
  ) => Promise<ReadonlyArray<D1Result>>
}

export interface D1PreparedStatement {
  readonly bind: (
    ...values: ReadonlyArray<string | number>
  ) => D1PreparedStatement
}

export interface D1Result {
  readonly results: ReadonlyArray<Record<string, unknown>>
}

const TOP = `
  SELECT module_id AS id, votes
  FROM tallies
  WHERE votes > 0
  ORDER BY votes DESC, module_id ASC`

const VOTED_BY = `SELECT module_id AS id FROM votes WHERE voter_id = ?1`

const ADD = `
  INSERT INTO votes (module_id, voter_id, created_at)
  VALUES (?1, ?2, ?3)
  ON CONFLICT (module_id, voter_id) DO NOTHING`

const REMOVE = `DELETE FROM votes WHERE module_id = ?1 AND voter_id = ?2`

const SYNC_TALLY = `
  INSERT INTO tallies (module_id, votes)
  VALUES (?1, (SELECT COUNT(*) FROM votes WHERE module_id = ?1))
  ON CONFLICT (module_id) DO UPDATE SET votes = excluded.votes`

const HAS_VOTED = `SELECT 1 AS found FROM votes WHERE module_id = ?1 AND voter_id = ?2`

const COUNT = `SELECT votes FROM tallies WHERE module_id = ?1`

export const layer = (db: D1Database) =>
  Layer.succeed(VoteStore, {
    top: () =>
      Effect.tryPromise({
        try: () => db.batch([db.prepare(TOP)]),
        catch: (cause) => new VoteStoreError({ cause }),
      }).pipe(
        Effect.map(([result]) =>
          (result?.results ?? []).map((row) => ({
            id: String(row.id),
            votes: Number(row.votes),
          })),
        ),
      ),

    votedBy: (voter) =>
      Effect.tryPromise({
        try: () => db.batch([db.prepare(VOTED_BY).bind(voter)]),
        catch: (cause) => new VoteStoreError({ cause }),
      }).pipe(
        Effect.map(([result]) =>
          (result?.results ?? []).map((row) => String(row.id)),
        ),
      ),

    vote: (voter, id, on) =>
      Effect.tryPromise({
        try: () =>
          db.batch([
            on
              ? db.prepare(ADD).bind(id, voter, Date.now())
              : db.prepare(REMOVE).bind(id, voter),
            db.prepare(SYNC_TALLY).bind(id),
            db.prepare(HAS_VOTED).bind(id, voter),
            db.prepare(COUNT).bind(id),
          ]),
        catch: (cause) => new VoteStoreError({ cause }),
      }).pipe(
        Effect.map(([, , voted, count]) => ({
          id,
          votes: Number(count?.results[0]?.votes ?? 0),
          voted: (voted?.results.length ?? 0) > 0,
        })),
      ),
  })
