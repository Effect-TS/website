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

let script: Promise<TurnstileApi> | undefined

const loadScript = (): Promise<TurnstileApi> =>
  (script ??= new Promise<TurnstileApi>((resolve, reject) => {
    const element = document.createElement("script")
    element.src = SCRIPT
    element.async = true
    element.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile did not load"))
    element.onerror = () => reject(new Error("Turnstile did not load"))
    document.head.append(element)
  }).catch((error: unknown) => {
    script = undefined
    throw error
  }))

/**
 * The token of an invisible Turnstile check. The widget has no interface: the
 * browser runs the check in the background and a visitor it cannot clear gets
 * no token. A token works once, so each vote runs its own check.
 */
export const solveChallenge = async (
  siteKey: string,
  container: HTMLElement,
): Promise<string> => {
  const turnstile = await loadScript()
  return new Promise((resolve, reject) => {
    const id = turnstile.render(container, {
      sitekey: siteKey,
      callback: (token) => {
        turnstile.remove(id)
        resolve(token)
      },
      "error-callback": () => {
        turnstile.remove(id)
        reject(new Error("Turnstile check failed"))
      },
      "timeout-callback": () => {
        turnstile.remove(id)
        reject(new Error("Turnstile check timed out"))
      },
    })
  })
}
