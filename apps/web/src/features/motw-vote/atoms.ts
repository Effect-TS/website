import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Order from "effect/Order"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import {
  BotCheck,
  MotwVoteClient,
  VoteLock,
  layer as clientLayer,
} from "./client"
import type { ModuleRef, RankedModule, VoteRefusal } from "./domain"

/** Three rows of four on desktop */
export const STEP = 12

export interface Message {
  readonly tone: "ok" | "error"
  readonly text: string
}

interface Ranking {
  readonly rows: ReadonlyArray<RankedModule>
  readonly siteKey: string
}

const runtime = Atom.runtime(clientLayer)

const error = (text: string): Message => ({ tone: "error", text })

const byVotes = Order.combine(
  Order.mapInput(Order.Number, ({ votes }: RankedModule) => -votes),
  Order.mapInput(Order.String, ({ name }: RankedModule) => name),
)

// Seeded by the page through `RegistryProvider`, so they must outlive subscribers
export const moduleIndexAtom = Atom.keepAlive(
  Atom.make<ReadonlyArray<ModuleRef>>([]),
)
export const coveredAtom = Atom.keepAlive(Atom.make<ReadonlyArray<string>>([]))

export const countAtom = Atom.make(STEP)
export const messageAtom = Atom.make<Message | null>(null)
export const highlightAtom = Atom.make<string | null>(null)

const requestsAtom = MotwVoteClient.query("motwVote", "ranking", {})

const loadedAtom = Atom.make((get) =>
  AsyncResult.map(
    get(requestsAtom),
    ({ requests, voted, turnstileSiteKey }): Ranking => {
      const modules = new Map(get(moduleIndexAtom).map((m) => [m.id, m]))
      const rows = Array.flatMap(requests, ({ id, votes }) => {
        const module = modules.get(id)
        return module ? [{ ...module, votes, voted: voted.includes(id) }] : []
      })
      return { rows: Array.sort(rows, byVotes), siteKey: turnstileSiteKey }
    },
  ),
)

// Writing a function patches the loaded value until the next load
export const rankingAtom: Atom.Writable<
  Atom.Type<typeof loadedAtom>,
  (ranking: Ranking) => Ranking
> = Atom.withServerValueInitial(
  Atom.writable(
    (get) => get(loadedAtom),
    (ctx, patch) => ctx.setSelf(AsyncResult.map(ctx.get(rankingAtom), patch)),
    (refresh) => refresh(requestsAtom),
  ),
)

const noTallies: ReadonlyMap<string, RankedModule> = new Map()

export const talliesAtom = Atom.withServerValue(
  Atom.make((get): ReadonlyMap<string, RankedModule> => {
    const ranking = get(rankingAtom)
    return new Map(
      AsyncResult.isSuccess(ranking)
        ? ranking.value.rows.map((row) => [row.id, row] as const)
        : [],
    )
  }),
  () => noTallies,
)

export const statusAtom = Atom.withServerValue(
  Atom.make((get): Message | null => {
    const ranking = get(rankingAtom)
    return AsyncResult.isFailure(ranking) && !AsyncResult.isWaiting(ranking)
      ? error("Couldn't load the suggestions. Try again later.")
      : get(messageAtom)
  }),
  () => null,
)

const refusalText = {
  Covered: (name) => `${name} has already been covered.`,
  UnknownModule: (name) => `${name} is not a module we can cover.`,
  RateLimited: () => "Too many votes in a short time. Try again in a minute.",
  ChallengeFailed: () =>
    "We could not tell you are not a bot, so your +1 was not saved.",
} satisfies Record<VoteRefusal, (name: string) => string>

const flashAtom = Atom.keepAlive(
  Atom.fn<string>()(
    Effect.fnUntraced(function* (id, get) {
      get.set(highlightAtom, id)
      yield* Effect.sleep("2400 millis")
      get.set(highlightAtom, null)
    }),
  ),
)

const castVote = Effect.fnUntraced(function* (
  get: Atom.FnContext,
  module: ModuleRef,
  on: boolean,
) {
  const { siteKey } = yield* get.result(rankingAtom)
  const client = yield* MotwVoteClient
  const outcome = on
    ? yield* Effect.gen(function* () {
        get.set(messageAtom, {
          tone: "ok",
          text: "Checking you are not a bot…",
        })
        const token = yield* (yield* BotCheck).solve(siteKey)
        return yield* client.vote({ payload: { id: module.id, token } })
      })
    : yield* client.unvote({ payload: { id: module.id } })
  get.set(rankingAtom, ({ rows, siteKey }) => {
    const row = { ...module, votes: outcome.votes, voted: outcome.voted }
    return {
      siteKey,
      rows: Array.some(rows, ({ id }) => id === module.id)
        ? Array.map(rows, (r) => (r.id === module.id ? row : r))
        : Array.sort(Array.append(rows, row), byVotes),
    }
  })
})

type VoteFailure = Effect.Error<ReturnType<typeof castVote>>

// A vote that starts while another runs is dropped. Pair with `concurrent: true`,
// or the atom would interrupt the running vote for the new one.
const exclusive =
  (get: Atom.FnContext, name: string) =>
  <R>(vote: Effect.Effect<Message | null, VoteFailure, R>) =>
    Effect.flatMap(VoteLock, (lock) =>
      lock.withPermitsIfAvailable(1)(
        vote.pipe(
          Effect.catchTags({
            VoteRefusedError: ({ reason }) =>
              Effect.succeed(error(refusalText[reason](name))),
            ChallengeUnavailable: () =>
              Effect.succeed(
                error(
                  "The bot check could not run. Turn off content blockers or try another browser, then try again.",
                ),
              ),
          }),
          Effect.catch(() =>
            Effect.succeed(error("Couldn't save your +1. Try again.")),
          ),
          Effect.tap((message) =>
            Effect.sync(() => get.set(messageAtom, message)),
          ),
        ),
      ),
    )

export const toggleAtom = runtime.fn<RankedModule>()(
  (row, get) =>
    exclusive(
      get,
      row.name,
    )(castVote(get, row, !row.voted).pipe(Effect.as(null))),
  { concurrent: true },
)

export const pickAtom = runtime.fn<ModuleRef>()(
  (module, get) =>
    exclusive(
      get,
      module.name,
    )(
      Effect.gen(function* () {
        if (get(coveredAtom).includes(module.id))
          return error(
            `${module.name} has already been covered. Find it in the modules above.`,
          )
        // Some names exist in more than one package
        const label = `${module.name} (${module.pkg})`
        const existing = (yield* get.result(rankingAtom)).rows.find(
          ({ id }) => id === module.id,
        )
        const wasVoted = existing?.voted ?? false
        if (!wasVoted) yield* castVote(get, module, true)
        const { rows } = yield* get.result(rankingAtom)
        const index = rows.findIndex(({ id }) => id === module.id)
        if (index >= get(countAtom))
          get.set(countAtom, Math.ceil((index + 1) / STEP) * STEP)
        get.set(flashAtom, module.id)
        return {
          tone: "ok",
          text: wasVoted
            ? `You've already +1'd ${label}.`
            : existing
              ? `+1 added to ${label}.`
              : `Added ${label} with your +1.`,
        } satisfies Message
      }),
    ),
  { concurrent: true },
)

export const votingAtom = Atom.make(
  (get) =>
    AsyncResult.isWaiting(get(toggleAtom)) ||
    AsyncResult.isWaiting(get(pickAtom)),
)
