import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Semaphore from "effect/Semaphore"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Atom from "effect/reactivity/Atom"
import * as AtomHttpApi from "effect/reactivity/AtomHttpApi"
import { MotwVoteApi } from "./api"

export class MotwVoteClient extends AtomHttpApi.Service<MotwVoteClient>()(
  "app/MotwVoteClient",
  { api: MotwVoteApi, httpClient: FetchHttpClient.layer },
) {}

interface TurnstileApi {
  readonly render: (
    container: HTMLElement,
    options: {
      readonly sitekey: string
      readonly callback: (token: string) => void
      readonly "error-callback": () => void
      readonly "timeout-callback": () => void
    },
  ) => string
  readonly remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

export class ChallengeUnavailable extends Data.TaggedError(
  "ChallengeUnavailable",
) {}

// The script sets `window.turnstile`, so a loaded script needs no cache
const loadScript = Effect.callback<TurnstileApi, ChallengeUnavailable>(
  (resume) => {
    if (window.turnstile) {
      resume(Effect.succeed(window.turnstile))
      return
    }
    const element = document.createElement("script")
    element.src = SCRIPT
    element.async = true
    element.onload = () =>
      resume(
        window.turnstile
          ? Effect.succeed(window.turnstile)
          : Effect.fail(new ChallengeUnavailable()),
      )
    element.onerror = () => resume(Effect.fail(new ChallengeUnavailable()))
    document.head.append(element)
    return Effect.sync(() => element.remove())
  },
)

const removeWidget = (turnstile: TurnstileApi, id: string) =>
  Effect.try(() => turnstile.remove(id)).pipe(Effect.ignore)

const renderWidget = (turnstile: TurnstileApi, siteKey: string) =>
  Effect.gen(function* () {
    const container = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const element = document.createElement("div")
        element.setAttribute("aria-hidden", "true")
        document.body.append(element)
        return element
      }),
      (element) => Effect.sync(() => element.remove()),
    )
    const { id, token } = yield* Effect.callback<
      { readonly id: string; readonly token: string },
      ChallengeUnavailable
    >((resume) => {
      const fail = () => resume(Effect.fail(new ChallengeUnavailable()))
      try {
        const id = turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => resume(Effect.sync(() => ({ id, token }))),
          "error-callback": fail,
          "timeout-callback": fail,
        })
        return removeWidget(turnstile, id)
      } catch {
        fail()
        return Effect.void
      }
    })
    yield* Effect.addFinalizer(() => removeWidget(turnstile, id))
    return token
  })

export class BotCheck extends Context.Service<
  BotCheck,
  {
    /** The token of an invisible Turnstile check. A token works once. */
    readonly solve: (
      siteKey: string,
    ) => Effect.Effect<string, ChallengeUnavailable>
  }
>()("app/BotCheck") {
  static readonly layer = Layer.succeed(this, {
    solve: Effect.fn("BotCheck.solve")(
      function* (siteKey: string) {
        const turnstile = yield* loadScript
        return yield* renderWidget(turnstile, siteKey)
      },
      Effect.scoped,
      Effect.timeout("20 seconds"),
      Effect.catchTag("TimeoutError", () =>
        Effect.fail(new ChallengeUnavailable()),
      ),
    ),
  })
}

export class VoteLock extends Context.Service<VoteLock, Semaphore.Semaphore>()(
  "app/VoteLock",
) {
  static readonly layer = Layer.effect(this, Semaphore.make(1))
}

/** What the island's atoms run with. */
export const layer = (get: Atom.AtomContext) =>
  Layer.mergeAll(
    get(MotwVoteClient.runtime.layer),
    BotCheck.layer,
    VoteLock.layer,
  )
