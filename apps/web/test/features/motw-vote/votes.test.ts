import { assert, describe, test } from "vite-plus/test"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import {
  ModuleCatalog,
  type ModuleStatus,
} from "../../../src/features/motw-vote/catalog.ts"
import { Voter } from "../../../src/features/motw-vote/middleware.ts"
import { MotwVotes } from "../../../src/features/motw-vote/service.ts"
import { Turnstile } from "../../../src/features/motw-vote/turnstile.ts"
import { VoterSigner } from "../../../src/features/motw-vote/voter.ts"
import {
  VoteStore,
  memoryLayer,
} from "../../../src/features/motw-vote/vote-store.ts"

const setup = Effect.gen(function* () {
  const statuses = yield* Ref.make<Record<string, ModuleStatus>>({
    "effect/Pool": "votable",
    "effect/Stream": "votable",
    "effect/RcMap": "covered",
  })
  const catalog = Layer.succeed(ModuleCatalog, {
    status: (id) =>
      Effect.map(Ref.get(statuses), (all) => all[id] ?? "unknown"),
  })
  const turnstile = Layer.succeed(Turnstile, {
    siteKey: "site-key",
    verify: (token) => Effect.succeed(token === "solved"),
  })
  const config = ConfigProvider.layer(
    ConfigProvider.fromEnvRecord({ MOTW_VOTE_SECRET: "test-secret" }),
  )
  const layer = MotwVotes.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(memoryLayer, catalog, turnstile, VoterSigner.layer),
    ),
    Layer.provide(config),
  )
  return { statuses, layer }
})

const run = <A, E>(
  use: (
    ports: Effect.Success<typeof setup>,
  ) => Effect.Effect<A, E, MotwVotes | VoteStore | VoterSigner>,
) =>
  Effect.runPromise(
    Effect.flatMap(setup, (ports) =>
      use(ports).pipe(Effect.provide(ports.layer)),
    ),
  )

const anonymous = Voter.Anonymous()
const input = (id: string, on: boolean, token?: string) => ({ id, on, token })

describe("motw votes", () => {
  test("a first vote issues a voter, and the cookie names the same voter", () =>
    run(() =>
      Effect.gen(function* () {
        const votes = yield* MotwVotes
        const signer = yield* VoterSigner
        const first = yield* votes.vote(
          anonymous,
          input("effect/Pool", true, "solved"),
        )
        assert.deepStrictEqual([first.votes, first.voted], [1, true])
        const id = yield* Option.match(first.issued, {
          onNone: () => Effect.die("no voter was issued"),
          onSome: (token) => Effect.succeed(signer.verify(token)),
        })
        const known = Voter.Known({ id: Option.getOrThrow(id) })
        const again = yield* votes.vote(
          known,
          input("effect/Stream", true, "solved"),
        )
        assert.isTrue(Option.isNone(again.issued))
        const { voted } = yield* votes.ranking(known)
        assert.sameMembers([...voted], ["effect/Pool", "effect/Stream"])
      }),
    ))

  test("ranks by votes, drops covered and unknown modules, and shows the site key", () =>
    run(({ statuses }) =>
      Effect.gen(function* () {
        const votes = yield* MotwVotes
        const store = yield* VoteStore
        yield* store.vote("a", "effect/Pool", true)
        yield* store.vote("b", "effect/Pool", true)
        yield* store.vote("a", "effect/Stream", true)
        yield* store.vote("a", "effect/Gone", true)
        yield* store.vote("a", "effect/RcMap", true)
        const ranking = yield* votes.ranking(Voter.Known({ id: "a" }))
        assert.deepStrictEqual(ranking.requests, [
          { id: "effect/Pool", votes: 2 },
          { id: "effect/Stream", votes: 1 },
        ])
        assert.sameMembers([...ranking.voted], ["effect/Pool", "effect/Stream"])
        assert.equal(ranking.turnstileSiteKey, "site-key")
        // A module the series covers later leaves the ranking
        yield* Ref.update(statuses, (all) => ({
          ...all,
          "effect/Pool": "covered" as const,
        }))
        const later = yield* votes.ranking(Voter.Known({ id: "a" }))
        assert.deepStrictEqual(later.requests, [
          { id: "effect/Stream", votes: 1 },
        ])
      }),
    ))

  test("turns down covered and unknown modules, and a missing or wrong check", () =>
    run(() =>
      Effect.gen(function* () {
        const votes = yield* MotwVotes
        const reason = (id: string, token?: string) =>
          votes.vote(anonymous, input(id, true, token)).pipe(
            Effect.flip,
            Effect.map((error) => error.reason),
          )
        assert.equal(yield* reason("effect/RcMap", "solved"), "Covered")
        assert.equal(yield* reason("other/Module", "solved"), "UnknownModule")
        assert.equal(yield* reason("effect/Pool"), "ChallengeFailed")
        assert.equal(yield* reason("effect/Pool", "forged"), "ChallengeFailed")
        assert.deepStrictEqual(yield* (yield* VoteStore).top(), [])
      }),
    ))

  test("a removal needs no check, and an anonymous one never reaches the store", () =>
    run(() =>
      Effect.gen(function* () {
        const votes = yield* MotwVotes
        const store = yield* VoteStore
        yield* store.vote("a", "effect/Pool", true)
        const nobody = yield* votes.vote(anonymous, input("effect/Pool", false))
        assert.deepStrictEqual(nobody, {
          id: "effect/Pool",
          votes: 0,
          voted: false,
          issued: Option.none(),
        })
        assert.deepStrictEqual(yield* store.top(), [
          { id: "effect/Pool", votes: 1 },
        ])
        const own = yield* votes.vote(
          Voter.Known({ id: "a" }),
          input("effect/Pool", false),
        )
        assert.deepStrictEqual([own.votes, own.voted], [0, false])
      }),
    ))

  test("a forged voter is refused", () =>
    run(() =>
      Effect.gen(function* () {
        const votes = yield* MotwVotes
        const refused = yield* votes
          .vote(Voter.Tampered(), input("effect/Pool", true, "solved"))
          .pipe(Effect.flip)
        assert.equal(refused.reason, "InvalidVoter")
      }),
    ))
})
