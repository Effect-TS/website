import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { afterEach, assert, describe, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ModuleCatalog } from "../../../src/features/motw-vote/catalog.ts"
import * as D1 from "../../../src/features/motw-vote/d1.ts"
import { MotwVotes } from "../../../src/features/motw-vote/service.ts"
import { Turnstile } from "../../../src/features/motw-vote/turnstile.ts"
import { NIL_VOTER } from "../../../src/features/motw-vote/voter.ts"
import {
  VoteStore,
  memoryLayer,
} from "../../../src/features/motw-vote/vote-store.ts"

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

// effect/RcMap and effect/cluster/Entity are covered by the series
const covered = new Set(["effect/RcMap", "effect/cluster/Entity"])

const retired = new Set<string>()

const catalog = Layer.succeed(ModuleCatalog, {
  status: (id) =>
    Effect.succeed(
      covered.has(id)
        ? "covered"
        : id.startsWith("effect/") && !retired.has(id)
          ? "votable"
          : "unknown",
    ),
})

const recordingStore = (calls: Array<string>) =>
  Layer.effect(
    VoteStore,
    Effect.gen(function* () {
      const store = yield* VoteStore
      return {
        top: () => (calls.push("top"), store.top()),
        votedBy: (voter) => (calls.push("votedBy"), store.votedBy(voter)),
        vote: (voter, id, on) => (
          calls.push("vote"),
          store.vote(voter, id, on)
        ),
      }
    }),
  ).pipe(Layer.provide(memoryLayer))

// A solved check gives the token "solved". Any other token is turned down.
const turnstile = Layer.succeed(Turnstile, {
  siteKey: "site-key",
  verify: (token) => Effect.succeed(token === "solved"),
})

const stores = {
  memory: () => memoryLayer,
  d1: () => D1.layer(sqliteD1()),
} as const

const withVotes = <A, E>(
  makeStore: () => Layer.Layer<VoteStore>,
  effect: Effect.Effect<A, E, MotwVotes>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        MotwVotes.layer.pipe(
          Layer.provide(Layer.mergeAll(makeStore(), catalog, turnstile)),
        ),
      ),
    ),
  )

const alice = "11111111-1111-4111-8111-111111111111"
const bob = "22222222-2222-4222-8222-222222222222"

describe.each(Object.entries(stores))(
  "module votes on the %s store",
  (_, makeStore) => {
    afterEach(() => {
      covered.clear()
      covered.add("effect/RcMap")
      covered.add("effect/cluster/Entity")
      retired.clear()
    })

    test("counts votes and ranks by votes, then by id", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          yield* votes.vote(alice, "effect/Stream", true, "solved")
          yield* votes.vote(bob, "effect/Stream", true, "solved")
          yield* votes.vote(
            "33333333-3333-4333-8333-333333333333",
            "effect/Schedule",
            true,
            "solved",
          )
          const { requests, voted, turnstileSiteKey } =
            yield* votes.ranking(alice)
          assert.deepEqual(requests, [
            { id: "effect/Stream", votes: 2 },
            { id: "effect/Schedule", votes: 1 },
          ])
          assert.deepEqual(voted, ["effect/Stream"])
          assert.equal(turnstileSiteKey, "site-key")
        }),
      ))

    test("a repeated vote counts once, and a removed vote needs no check", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          yield* votes.vote(alice, "effect/Pool", true, "solved")
          const again = yield* votes.vote(alice, "effect/Pool", true, "solved")
          assert.deepEqual(again, { id: "effect/Pool", votes: 1, voted: true })
          const removed = yield* votes.vote(
            alice,
            "effect/Pool",
            false,
            undefined,
          )
          assert.deepEqual(removed, {
            id: "effect/Pool",
            votes: 0,
            voted: false,
          })
          const missing = yield* votes.vote(
            alice,
            "effect/Pool",
            false,
            undefined,
          )
          assert.deepEqual(missing, {
            id: "effect/Pool",
            votes: 0,
            voted: false,
          })
          assert.deepEqual((yield* votes.ranking(alice)).requests, [])
        }),
      ))

    test("a visitor votes for as many modules as they like, once each", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          for (const id of [
            "effect/Pool",
            "effect/Stream",
            "effect/Schedule",
          ]) {
            assert.isTrue((yield* votes.vote(alice, id, true, "solved")).voted)
          }
          assert.sameMembers(
            [...(yield* votes.ranking(alice)).voted],
            ["effect/Pool", "effect/Stream", "effect/Schedule"],
          )
          const again = yield* votes.vote(alice, "effect/Pool", true, "solved")
          assert.deepEqual(again, { id: "effect/Pool", votes: 1, voted: true })
          assert.lengthOf((yield* votes.ranking(alice)).voted, 3)
          // Someone else votes for the same module on top
          assert.deepEqual(
            yield* votes.vote(bob, "effect/Pool", true, "solved"),
            {
              id: "effect/Pool",
              votes: 2,
              voted: true,
            },
          )
        }),
      ))

    test("votes arriving together for one module count once", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          yield* Effect.forEach(
            Array.from({ length: 10 }, () => undefined),
            () => Effect.exit(votes.vote(alice, "effect/Pool", true, "solved")),
            { concurrency: "unbounded" },
          )
          assert.deepEqual((yield* votes.ranking(alice)).requests, [
            { id: "effect/Pool", votes: 1 },
          ])
        }),
      ))

    test("turns down covered and unknown modules", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          const reason = (id: string) =>
            votes.vote(alice, id, true, "solved").pipe(
              Effect.flip,
              Effect.map((error) => error.reason),
            )
          assert.equal(yield* reason("effect/RcMap"), "Covered")
          assert.equal(yield* reason("effect/cluster/Entity"), "Covered")
          assert.equal(yield* reason("other/Module"), "UnknownModule")
          assert.deepEqual((yield* votes.ranking(alice)).requests, [])
        }),
      ))

    test("a new vote needs a solved check", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          const reason = (token: string | undefined) =>
            votes.vote(alice, "effect/Pool", true, token).pipe(
              Effect.flip,
              Effect.map((error) => error.reason),
            )
          assert.equal(yield* reason(undefined), "ChallengeFailed")
          assert.equal(yield* reason("forged"), "ChallengeFailed")
          assert.deepEqual((yield* votes.ranking(alice)).requests, [])
          assert.isTrue(
            (yield* votes.vote(alice, "effect/Pool", true, "solved")).voted,
          )
        }),
      ))

    test("the ranking has no limit", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          const ids = Array.from({ length: 150 }, (_, i) => `effect/M${i}`)
          yield* Effect.forEach(ids, (id) =>
            votes.vote(alice, id, true, "solved"),
          )
          const { requests, voted } = yield* votes.ranking(alice)
          assert.lengthOf(requests, 150)
          assert.lengthOf(voted, 150)
        }),
      ))

    test("the ranking drops modules that became covered", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          yield* votes.vote(alice, "effect/Pool", true, "solved")
          yield* votes.vote(bob, "effect/Pool", true, "solved")
          yield* votes.vote(alice, "effect/Stream", true, "solved")
          covered.add("effect/Pool")
          const { requests, voted } = yield* votes.ranking(alice)
          assert.deepEqual(requests, [{ id: "effect/Stream", votes: 1 }])
          assert.deepEqual(voted, ["effect/Stream"])
        }),
      ))

    test("the ranking drops modules the catalog does not know", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          yield* votes.vote(alice, "effect/Gone", true, "solved")
          yield* votes.vote(alice, "effect/Pool", true, "solved")
          retired.add("effect/Gone")
          const { requests, voted } = yield* votes.ranking(alice)
          assert.deepEqual(requests, [{ id: "effect/Pool", votes: 1 }])
          assert.deepEqual(voted, ["effect/Pool"])
        }),
      ))

    test("a removal from the nil voter does not reach the store", () => {
      const calls: Array<string> = []
      return Effect.runPromise(
        Effect.gen(function* () {
          const votes = yield* MotwVotes
          const removed = yield* votes.vote(
            NIL_VOTER,
            "effect/Pool",
            false,
            undefined,
          )
          assert.deepEqual(removed, {
            id: "effect/Pool",
            votes: 0,
            voted: false,
          })
          const reason = yield* votes
            .vote(NIL_VOTER, "effect/Pool", true, "solved")
            .pipe(
              Effect.flip,
              Effect.map((error) => error.reason),
            )
          assert.equal(reason, "InvalidVoter")
          assert.deepEqual(calls, [])
        }).pipe(
          Effect.provide(
            MotwVotes.layer.pipe(
              Layer.provide(
                Layer.mergeAll(recordingStore(calls), catalog, turnstile),
              ),
            ),
          ),
        ),
      )
    })
  },
)
