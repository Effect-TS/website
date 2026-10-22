import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Semaphore from "effect/Semaphore"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import { BotCheck } from "./bot-check"
import { MotwVoteClient } from "./client"
import {
  type ModuleRef,
  type RankedModule,
  type VoteRefusal,
  searchModules,
} from "./domain"

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

export type NavigationKey = "ArrowDown" | "ArrowUp" | "Escape"

const runtime = Atom.runtime(
  Layer.mergeAll(MotwVoteClient.layer, BotCheck.layer),
)

const error = (text: string): Message => ({ tone: "error", text })

const byVotes = (a: RankedModule, b: RankedModule) =>
  b.votes - a.votes || a.name.localeCompare(b.name)

// Seeded by the page through `RegistryProvider`, so they must outlive subscribers
export const moduleIndexAtom = Atom.keepAlive(
  Atom.make<ReadonlyArray<ModuleRef>>([]),
)
export const coveredAtom = Atom.keepAlive(Atom.make<ReadonlyArray<string>>([]))

export const queryAtom = Atom.make("")
export const activeAtom = Atom.make(0)
export const openAtom = Atom.make(false)
export const countAtom = Atom.make(STEP)
export const messageAtom = Atom.make<Message | null>(null)
export const highlightAtom = Atom.make<string | null>(null)

export const searchResultsAtom = Atom.make((get) =>
  searchModules(get(moduleIndexAtom), get(queryAtom)),
)

const loadedAtom = runtime.atom(
  Effect.fnUntraced(function* (get) {
    const client = yield* MotwVoteClient
    const { requests, voted, turnstileSiteKey } = yield* client.ranking()
    const modules = new Map(get(moduleIndexAtom).map((m) => [m.id, m]))
    const rows = requests.flatMap(({ id, votes }) => {
      const module = modules.get(id)
      return module ? [{ ...module, votes, voted: voted.includes(id) }] : []
    })
    const ranking: Ranking = {
      rows: rows.sort(byVotes),
      siteKey: turnstileSiteKey,
    }
    return ranking
  }),
)

// Writing a function patches the loaded value until the next load
export const rankingAtom: Atom.Writable<
  Atom.Type<typeof loadedAtom>,
  (ranking: Ranking) => Ranking
> = Atom.withServerValueInitial(
  Atom.writable(
    (get) => get(loadedAtom),
    (ctx, patch) => ctx.setSelf(AsyncResult.map(ctx.get(rankingAtom), patch)),
    (refresh) => refresh(loadedAtom),
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
      rows: rows.some(({ id }) => id === module.id)
        ? rows.map((r) => (r.id === module.id ? row : r))
        : [...rows, row].sort(byVotes),
    }
  })
})

type VoteFailure = Effect.Error<ReturnType<typeof castVote>>

const lock = Semaphore.makeUnsafe(1)

// A vote that starts while another runs is dropped. Pair with `concurrent: true`,
// or the atom would interrupt the running vote for the new one.
const exclusive =
  (get: Atom.FnContext, name: string) =>
  <R>(vote: Effect.Effect<Message | null, VoteFailure, R>) =>
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
        get.set(openAtom, false)
        get.set(queryAtom, "")
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

export const changeQueryAtom = Atom.fnSync<string>()((value, get) => {
  get.set(queryAtom, value)
  get.set(activeAtom, 0)
  get.set(openAtom, true)
  if (get(messageAtom)?.tone === "error") get.set(messageAtom, null)
})

export const navigateAtom = Atom.fnSync<NavigationKey>()((key, get) => {
  if (key === "Escape") return get.set(openAtom, false)
  get.set(openAtom, true)
  const last = get(searchResultsAtom).length - 1
  get.set(
    activeAtom,
    key === "ArrowDown"
      ? Math.min(get(activeAtom) + 1, last)
      : Math.max(get(activeAtom) - 1, 0),
  )
})

export const submitAtom = Atom.fnSync<void>()((_, get) => {
  if (get(votingAtom)) return
  const query = get(queryAtom).trim()
  const results = get(searchResultsAtom)
  const choice = results[get(activeAtom)] ?? results[0]
  if (!query) get.set(messageAtom, error("Search for a module to +1."))
  else if (!choice)
    get.set(
      messageAtom,
      error(`No module matches "${query}". Try another name.`),
    )
  else get.set(pickAtom, choice)
})
