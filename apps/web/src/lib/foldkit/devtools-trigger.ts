import { DEVTOOLS_HOST_ID } from "foldkit/devtools-host"

const BADGE_SELECTOR = ".dt-badge"
const PANEL_SELECTOR = ".dt-panel"
const NATIVE_TRIGGER_STYLE_ID = "foldkit-devtools-native-trigger"
const TOOLBAR_CLEARANCE = "72px"

/**
 * Opens and closes the Foldkit DevTools panel from outside it. The panel's
 * state lives in the overlay's own Model, so this prototype drives the overlay
 * through its shadow DOM: it hides the built-in badge and clicks it. A
 * controller exported by Foldkit would replace this module.
 */
export interface DevToolsTrigger {
  readonly isOpen: () => boolean
  readonly toggle: () => void
  readonly subscribe: (listener: (isOpen: boolean) => void) => () => void
}

const hostShadow = (): ShadowRoot | null =>
  document.getElementById(DEVTOOLS_HOST_ID)?.shadowRoot ?? null

/**
 * Hides the overlay's badge so a native control is the only trigger, and lifts
 * a bottom panel and the pause blocker clear of the Astro toolbar, which they
 * would otherwise cover.
 */
export const useNativeTrigger = (): void => {
  const shadow = hostShadow()
  if (
    shadow === null ||
    shadow.getElementById(NATIVE_TRIGGER_STYLE_ID) !== null
  ) {
    return
  }
  const style = document.createElement("style")
  style.id = NATIVE_TRIGGER_STYLE_ID
  style.textContent = `
    ${BADGE_SELECTOR} { display: none !important; }
    .dt-panel-br, .dt-panel-bl { bottom: ${TOOLBAR_CLEARANCE}; }
    .dt-interaction-blocker { bottom: ${TOOLBAR_CLEARANCE}; }
  `
  shadow.appendChild(style)
}

/**
 * A paused application sits behind a full-screen blocker that only the open
 * panel can lift. Closing the panel while paused would lock the page, so the
 * trigger resumes first.
 */
const resumeApplication = (shadow: ShadowRoot): void => {
  Array.from(shadow.querySelectorAll<HTMLElement>(".dt-panel button"))
    .find((button) => button.textContent?.trim().startsWith("Resume"))
    ?.click()
}

const makeTrigger = (shadow: ShadowRoot): DevToolsTrigger => {
  const isOpen = () => shadow.querySelector(PANEL_SELECTOR) !== null
  return {
    isOpen,
    toggle: () => {
      if (isOpen()) {
        resumeApplication(shadow)
      }
      shadow.querySelector<HTMLElement>(BADGE_SELECTOR)?.click()
    },
    subscribe: (listener) => {
      let last = isOpen()
      const observer = new MutationObserver(() => {
        const next = isOpen()
        if (next !== last) {
          last = next
          listener(next)
        }
      })
      observer.observe(shadow, { childList: true, subtree: true })
      return () => observer.disconnect()
    },
  }
}

/**
 * Resolves once a Foldkit application has mounted its DevTools overlay. It
 * never resolves on a page without one.
 */
export const connectTrigger = (): Promise<DevToolsTrigger> =>
  new Promise((resolve) => {
    const settle = (): boolean => {
      const shadow = hostShadow()
      if (shadow === null) {
        return false
      }
      useNativeTrigger()
      resolve(makeTrigger(shadow))
      return true
    }
    if (settle()) {
      return
    }
    const observer = new MutationObserver(() => {
      if (settle()) {
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true })
  })
