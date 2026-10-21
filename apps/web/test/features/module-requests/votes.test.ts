import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { assert, describe, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ModuleContent } from "../../../src/features/module-of-the-week/content.ts"
import { Modules } from "../../../src/features/module-of-the-week/service.ts"
import type { ModulePost } from "../../../src/features/module-of-the-week/domain.ts"
import { ModuleCatalog } from "../../../src/features/module-requests/catalog.ts"
import * as D1 from "../../../src/features/module-requests/d1.ts"
import { VOTE_CAP } from "../../../src/features/module-requests/domain.ts"
import { ModuleVotes } from "../../../src/features/module-requests/service.ts"
import { Turnstile } from "../../../src/features/module-requests/turnstile.ts"
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

const post = (id: string, apiModules?: ReadonlyArray<string>) =>
  ({
    id,
    data: { title: id, date: new Date("2026-09-16"), apiModules },
  }) as unknown as ModulePost

// The series has covered effect/RcMap and effect/cluster/Entity, in its posts' frontmatter
const modules = Modules.layer.pipe(
  Layer.provide(
    Layer.succeed(ModuleContent, {
      posts: Effect.succeed([
        post("module-of-the-week/rcmap", ["effect/RcMap"]),
        post("module-of-the-week/cluster", [
          "effect/cluster/Entity",
          "effect/Fiber",
        ]),
        post("module-of-the-week/intro"),
      ]),
      intro: Effect.succeedNone,
    }),
  ),
)

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
  effect: Effect.Effect<A, E, ModuleVotes>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        ModuleVotes.layer.pipe(
          Layer.provide(
            Layer.mergeAll(makeStore(), catalog, modules, turnstile),
          ),
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
          const votes = yield* ModuleVotes
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

    test("a visitor holds one vote, and frees it by removing it", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          assert.equal(VOTE_CAP, 1)
          const votes = yield* ModuleVotes
          yield* votes.vote(alice, "effect/Pool", true, "solved")
          const refused = yield* votes
            .vote(alice, "effect/Stream", true, "solved")
            .pipe(Effect.flip)
          assert.equal(refused.reason, "VoteLimit")
          // Someone else is not held back
          assert.isTrue(
            (yield* votes.vote(bob, "effect/Stream", true, "solved")).voted,
          )
          // The vote the visitor already holds still goes through
          assert.isTrue(
            (yield* votes.vote(alice, "effect/Pool", true, "solved")).voted,
          )
          yield* votes.vote(alice, "effect/Pool", false, undefined)
          assert.isTrue(
            (yield* votes.vote(alice, "effect/Stream", true, "solved")).voted,
          )
        }),
      ))

    test("votes arriving together cannot pass the cap", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          yield* Effect.forEach(
            Array.from({ length: 10 }, (_, n) => n),
            (n) =>
              Effect.exit(
                votes.vote(alice, `effect/Concurrent${n}`, true, "solved"),
              ),
            { concurrency: "unbounded" },
          )
          assert.lengthOf((yield* votes.ranking(alice)).voted, VOTE_CAP)
        }),
      ))

    test("turns down covered modules from the posts' frontmatter, and unknown ones", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
          const reason = (id: string) =>
            votes.vote(alice, id, true, "solved").pipe(
              Effect.flip,
              Effect.map((error) => error.reason),
            )
          assert.equal(yield* reason("effect/RcMap"), "Covered")
          assert.equal(yield* reason("effect/cluster/Entity"), "Covered")
          assert.equal(yield* reason("effect/Fiber"), "Covered")
          assert.equal(yield* reason("other/Module"), "UnknownModule")
          assert.deepEqual((yield* votes.ranking(alice)).requests, [])
        }),
      ))

    test("a new vote needs a solved check", () =>
      withVotes(
        makeStore,
        Effect.gen(function* () {
          const votes = yield* ModuleVotes
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
  },
)
