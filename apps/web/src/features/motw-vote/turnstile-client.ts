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

const CHALLENGE_TIMEOUT_MS = 20_000

/** The human check could not run: blocked, failed or too slow. */
export class ChallengeUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChallengeUnavailable"
  }
}

let script: Promise<TurnstileApi> | undefined

const loadScript = (): Promise<TurnstileApi> =>
  (script ??= new Promise<TurnstileApi>((resolve, reject) => {
    const element = document.createElement("script")
    element.src = SCRIPT
    element.async = true
    element.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new ChallengeUnavailable("Turnstile did not load"))
    element.onerror = () => {
      element.remove()
      reject(new ChallengeUnavailable("Turnstile did not load"))
    }
    document.head.append(element)
  }).catch((error: unknown) => {
    script = undefined
    throw error
  }))

/**
 * The token of an invisible Turnstile check. The widget has no interface: the
 * browser runs the check in the background and a visitor it cannot clear gets
 * no token. A token works once, so each vote runs its own check. Rejects with
 * `ChallengeUnavailable` when the check cannot run or takes too long.
 */
export const solveChallenge = async (
  siteKey: string,
  container: HTMLElement,
): Promise<string> => {
  const turnstile = await loadScript()
  return new Promise((resolve, reject) => {
    let id: string | undefined
    let settled = false
    const timer = window.setTimeout(
      () => end(() => reject(new ChallengeUnavailable("Turnstile timed out"))),
      CHALLENGE_TIMEOUT_MS,
    )
    const end = (settle: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (id !== undefined) {
        try {
          turnstile.remove(id)
        } catch {
          // widget already gone
        }
      }
      settle()
    }
    try {
      id = turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => end(() => resolve(token)),
        "error-callback": () =>
          end(() => reject(new ChallengeUnavailable("Turnstile check failed"))),
        "timeout-callback": () =>
          end(() =>
            reject(new ChallengeUnavailable("Turnstile check timed out")),
          ),
      })
    } catch {
      end(() => reject(new ChallengeUnavailable("Turnstile could not start")))
      return
    }
    // A callback that fired during render() could not remove the widget yet
    if (settled) turnstile.remove(id)
  })
}
