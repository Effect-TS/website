import { assert, describe, test } from "vite-plus/test"
import * as D1Client from "@effect/sql-d1/D1Client"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { layer as sqlLayer } from "../../../src/features/motw-vote/sql-vote-store.ts"
import {
  VoteStore,
  memoryLayer,
} from "../../../src/features/motw-vote/vote-store.ts"
import { sqliteD1 } from "./sqlite-d1.ts"

const stores = {
  memory: () => memoryLayer,
  sql: () => sqlLayer.pipe(Layer.provide(D1Client.layer({ db: sqliteD1() }))),
} as const

const alice = "alice"
const bob = "bob"

describe.each(Object.entries(stores))("vote store: %s", (_, makeStore) => {
  const run = <A, E>(effect: Effect.Effect<A, E, VoteStore>) =>
    Effect.runPromise(effect.pipe(Effect.provide(makeStore())))

  test("starts empty", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        assert.deepStrictEqual(yield* store.top(), [])
        assert.deepStrictEqual(yield* store.votedBy(alice), [])
      }),
    ))

  test("adding is idempotent and reports the vote", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        const first = yield* store.vote(alice, "effect/Stream", true)
        const again = yield* store.vote(alice, "effect/Stream", true)
        assert.deepStrictEqual(first, {
          id: "effect/Stream",
          votes: 1,
          voted: true,
        })
        assert.deepStrictEqual(again, first)
        assert.deepStrictEqual(yield* store.top(), [
          { id: "effect/Stream", votes: 1 },
        ])
      }),
    ))

  test("removing is idempotent and drops the module from the ranking", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        yield* store.vote(alice, "effect/Stream", true)
        const removed = yield* store.vote(alice, "effect/Stream", false)
        const again = yield* store.vote(alice, "effect/Stream", false)
        const never = yield* store.vote(bob, "effect/Layer", false)
        assert.deepStrictEqual(removed, {
          id: "effect/Stream",
          votes: 0,
          voted: false,
        })
        assert.deepStrictEqual(again, removed)
        assert.deepStrictEqual(never, {
          id: "effect/Layer",
          votes: 0,
          voted: false,
        })
        assert.deepStrictEqual(yield* store.top(), [])
        assert.deepStrictEqual(yield* store.votedBy(alice), [])
      }),
    ))

  test("a removal leaves other voters' votes", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        yield* store.vote(alice, "effect/Stream", true)
        yield* store.vote(bob, "effect/Stream", true)
        const outcome = yield* store.vote(alice, "effect/Stream", false)
        assert.deepStrictEqual(outcome, {
          id: "effect/Stream",
          votes: 1,
          voted: false,
        })
        assert.deepStrictEqual(yield* store.votedBy(bob), ["effect/Stream"])
      }),
    ))

  test("ranks by votes, then by id", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        yield* store.vote(alice, "effect/Stream", true)
        yield* store.vote(bob, "effect/Stream", true)
        yield* store.vote(alice, "effect/Schedule", true)
        yield* store.vote(alice, "effect/Layer", true)
        yield* store.vote(bob, "effect/Chunk", true)
        yield* store.vote(bob, "effect/Chunk", false)
        yield* store.vote(bob, "effect/Chunk", true)
        assert.deepStrictEqual(yield* store.top(), [
          { id: "effect/Stream", votes: 2 },
          { id: "effect/Chunk", votes: 1 },
          { id: "effect/Layer", votes: 1 },
          { id: "effect/Schedule", votes: 1 },
        ])
      }),
    ))

  test("votedBy lists one visitor's modules by id", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        yield* store.vote(alice, "effect/Stream", true)
        yield* store.vote(alice, "effect/Layer", true)
        yield* store.vote(bob, "effect/Schedule", true)
        assert.deepStrictEqual(yield* store.votedBy(alice), [
          "effect/Layer",
          "effect/Stream",
        ])
        assert.deepStrictEqual(yield* store.votedBy(bob), ["effect/Schedule"])
        assert.deepStrictEqual(yield* store.votedBy("carol"), [])
      }),
    ))

  test("top has no limit", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        const ids = Arr.makeBy(
          150,
          (i) => `effect/M${String(i).padStart(3, "0")}`,
        )
        yield* Effect.forEach(ids, (id) => store.vote(alice, id, true))
        const top = yield* store.top()
        assert.deepStrictEqual(
          top.map(({ id }) => id),
          ids,
        )
        assert.isTrue(top.every(({ votes }) => votes === 1))
        assert.strictEqual((yield* store.votedBy(alice)).length, 150)
      }),
    ))

  test("counts many voters", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        const voters = Arr.makeBy(60, (i) => `voter-${i}`)
        yield* Effect.forEach(voters, (voter) =>
          store.vote(voter, "effect/Stream", true),
        )
        assert.deepStrictEqual(yield* store.top(), [
          { id: "effect/Stream", votes: 60 },
        ])
      }),
    ))

  test("concurrent adds of the same vote count once", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        const outcomes = yield* Effect.forEach(
          Arr.replicate(store.vote(alice, "effect/Stream", true), 20),
          (vote) => vote,
          { concurrency: "unbounded" },
        )
        assert.isTrue(outcomes.every(({ voted }) => voted))
        assert.deepStrictEqual(yield* store.top(), [
          { id: "effect/Stream", votes: 1 },
        ])
      }),
    ))

  test("concurrent adds by different voters all count", () =>
    run(
      Effect.gen(function* () {
        const store = yield* VoteStore
        yield* Effect.forEach(
          Arr.makeBy(25, (i) => `voter-${i}`),
          (voter) => store.vote(voter, "effect/Stream", true),
          { concurrency: "unbounded" },
        )
        assert.deepStrictEqual(yield* store.top(), [
          { id: "effect/Stream", votes: 25 },
        ])
      }),
    ))
})
