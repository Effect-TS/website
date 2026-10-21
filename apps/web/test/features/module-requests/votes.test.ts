import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { assert, describe, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Exit from "effect/Exit"
import { VoteRefusedError } from "../../../src/features/module-requests/api.ts"
import { ModuleCatalog } from "../../../src/features/module-requests/catalog.ts"
import * as D1 from "../../../src/features/module-requests/d1.ts"
import { VOTE_CAP } from "../../../src/features/module-requests/domain.ts"
import { ModuleVotes } from "../../../src/features/module-requests/service.ts"
import {
  VoteStore,
  memoryLayer,
} from "../../../src/features/module-requests/vote-store.ts"

const migration = readFileSync(
  new URL("../../../migrations/0001_module_votes.sql", import.meta.url),
  "utf8",
)

interface Statement extends D1.D1PreparedStatement {
  readonly query: string
  readonly values: ReadonlyArray<string | number>
}

/** A D1 database backed by SQLite, so the real SQL runs in tests. */
const sqliteD1 = (): D1.D1Database => {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(migration)
  const statement = (
    query: string,
    values: ReadonlyArray<string | number>,
  ): Statement => ({
    query,
    values,
    bind: (...next) => statement(query, next),
  })
  return {
    prepare: (query) => statement(query, []),
    batch: async (statements) => {
      sqlite.exec("BEGIN")
      try {
        const results = (statements as ReadonlyArray<Statement>).map(
          ({ query, values }) => {
            const prepared = sqlite.prepare(query)
            if (/^\s*select/i.test(query)) {
              return {
                results: prepared.all(...values) as Array<
                  Record<string, unknown>
                >,
              }
            }
            prepared.run(...values)
            return { results: [] }
          },
        )
        sqlite.exec("COMMIT")
        return results
      } catch (error) {
        sqlite.exec("ROLLBACK")
        throw error
      }
    },
  }
}

const catalog = Layer.succeed(ModuleCatalog, {
  has: (id) => Effect.succeed(id.startsWith("effect/")),
})

const stores = {
  memory: () => memoryLayer,
  d1: () => D1.layer(sqliteD1()),
} as const

const withVotes = <A, E>(
  makeStore: () => Layer.Layer<VoteStore>,
  effect: Effect.Effect<A, E, ModuleVotes>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        ModuleVotes.layer.pipe(
          Layer.provide(Layer.mergeAll(makeStore(), catalog)),
        ),
      ),
    ),
  )

const alice = "11111111-1111-4111-8111-111111111111"
const bob = "22222222-2222-4222-8222-222222222222"

describe.each(Object.entries(stores))(
  "module votes on the %s store",
  (_, makeStore) => {
    test("counts votes and ranks by votes, then by id", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          yield* votes.vote(alice, "effect/Stream", true)
          yield* votes.vote(alice, "effect/Schedule", true)
          yield* votes.vote(bob, "effect/Stream", true)
          const { requests, voted } = yield* votes.ranking(alice)
          assert.deepEqual(requests, [
            { id: "effect/Stream", votes: 2 },
            { id: "effect/Schedule", votes: 1 },
          ])
          assert.sameMembers([...voted], ["effect/Stream", "effect/Schedule"])
        }),
      ))

    test("a repeated vote counts once and a removed vote is gone", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          yield* votes.vote(alice, "effect/Pool", true)
          const again = yield* votes.vote(alice, "effect/Pool", true)
          assert.deepEqual(again, { id: "effect/Pool", votes: 1, voted: true })
          const removed = yield* votes.vote(alice, "effect/Pool", false)
          assert.deepEqual(removed, {
            id: "effect/Pool",
            votes: 0,
            voted: false,
          })
          const missing = yield* votes.vote(alice, "effect/Pool", false)
          assert.deepEqual(missing, {
            id: "effect/Pool",
            votes: 0,
            voted: false,
          })
          assert.deepEqual((yield* votes.ranking(alice)).requests, [])
        }),
      ))

    test("a visitor holds at most the cap, and frees a slot by removing a vote", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          for (let n = 0; n < VOTE_CAP; n++)
            yield* votes.vote(alice, `effect/Module${n}`, true)
          const over = yield* Effect.exit(
            votes.vote(alice, "effect/OneMore", true),
          )
          assert.isTrue(Exit.isFailure(over))
          assert.deepEqual(
            Exit.isFailure(over)
              ? over.cause.reasons.map((r) => (r as { error?: unknown }).error)
              : [],
            [new VoteRefusedError({ reason: "VoteLimit" })],
          )
          // Someone else is not held back
          assert.isTrue((yield* votes.vote(bob, "effect/OneMore", true)).voted)
          // A vote the visitor already holds still goes through at the cap
          assert.isTrue(
            (yield* votes.vote(alice, "effect/Module0", true)).voted,
          )
          yield* votes.vote(alice, "effect/Module0", false)
          assert.isTrue(
            (yield* votes.vote(alice, "effect/OneMore", true)).voted,
          )
        }),
      ))

    test("votes arriving together cannot pass the cap", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          yield* Effect.forEach(
            Array.from({ length: VOTE_CAP * 3 }, (_, n) => n),
            (n) =>
              Effect.exit(votes.vote(alice, `effect/Concurrent${n}`, true)),
            { concurrency: "unbounded" },
          )
          assert.lengthOf((yield* votes.ranking(alice)).voted, VOTE_CAP)
        }),
      ))

    test("turns down covered and unknown modules", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          const reason = (id: string) =>
            votes.vote(alice, id, true).pipe(
              Effect.flip,
              Effect.map((error) => error.reason),
            )
          assert.equal(yield* reason("effect/RcMap"), "Covered")
          assert.equal(yield* reason("other/Module"), "UnknownModule")
          assert.deepEqual((yield* votes.ranking(alice)).requests, [])
        }),
      ))
  },
)
