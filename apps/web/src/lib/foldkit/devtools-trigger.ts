import { DEVTOOLS_HOST_ID } from "foldkit/devtools-host"
import { devToolsRegistry } from "./devtools-registry"

const BADGE_SELECTOR = ".dt-badge"
const PANEL_SELECTOR = ".dt-panel"
const NATIVE_TRIGGER_STYLE_ID = "foldkit-devtools-native-trigger"
const HOST_STACKING_STYLE_ID = "foldkit-devtools-stacking"
const BELOW_ASTRO_TOOLBAR = "999998"

/**
 * Opens and closes the Foldkit DevTools panel from outside it. The panel's
 * state lives in the overlay's own Model, so this prototype drives the overlay
 * through its shadow DOM: it hides the built-in badge and clicks it. A
 * controller exported by Foldkit would replace this module.
 *
 * Every call looks the overlay host up again, because selecting another app
 * replaces the host.
 */
export interface DevToolsTrigger {
  readonly isOpen: () => boolean
  readonly toggle: () => void
  readonly open: () => void
  readonly close: () => void
  readonly subscribe: (listener: (isOpen: boolean) => void) => () => void
}

const hostShadow = (): ShadowRoot | null =>
  document.getElementById(DEVTOOLS_HOST_ID)?.shadowRoot ?? null

export const hostShadowRoot = hostShadow

/**
 * Hides the overlay's badge so a native control is the only trigger, and stacks
 * the overlay just below the Astro toolbar, so the pause blocker never covers
 * it.
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
  `
  shadow.appendChild(style)
  if (document.getElementById(HOST_STACKING_STYLE_ID) === null) {
    const stacking = document.createElement("style")
    stacking.id = HOST_STACKING_STYLE_ID
    stacking.textContent = `#${DEVTOOLS_HOST_ID} { z-index: ${BELOW_ASTRO_TOOLBAR} !important; }`
    document.head.appendChild(stacking)
  }
}

/**
 * A paused application sits behind a full-screen blocker that only the open
 * panel can lift. Closing the panel or switching apps while paused would lock
 * the page, so the trigger resumes first.
 */
export const resumeApplication = (): void => {
  Array.from(
    hostShadow()?.querySelectorAll<HTMLElement>(".dt-panel button") ?? [],
  )
    .find((button) => button.textContent?.trim().startsWith("Resume"))
    ?.click()
}

const isRendered = (): boolean =>
  hostShadow()?.querySelector(`${BADGE_SELECTOR}, ${PANEL_SELECTOR}`) != null

/**
 * A newly mounted overlay renders its badge a moment after its host appears.
 * Acts as soon as the badge or the panel exists.
 */
const whenOverlayRendered = (action: () => unknown): void => {
  if (isRendered()) {
    action()
    return
  }
  const observer = new MutationObserver(() => {
    if (isRendered()) {
      observer.disconnect()
      action()
    }
  })
  observer.observe(document, { childList: true, subtree: true })
  const watchShadow = () => {
    const shadow = hostShadow()
    if (shadow !== null) {
      observer.observe(shadow, { childList: true, subtree: true })
    }
  }
  watchShadow()
  new MutationObserver((_, hostObserver) => {
    if (hostShadow() !== null) {
      hostObserver.disconnect()
      watchShadow()
    }
  }).observe(document.body, { childList: true })
}

const isOpen = (): boolean =>
  hostShadow()?.querySelector(PANEL_SELECTOR) != null

const toggle = (): void => {
  if (isOpen()) {
    resumeApplication()
  }
  hostShadow()?.querySelector<HTMLElement>(BADGE_SELECTOR)?.click()
}

export const trigger: DevToolsTrigger = {
  isOpen,
  toggle,
  open: () => whenOverlayRendered(() => !isOpen() && toggle()),
  close: () => whenOverlayRendered(() => isOpen() && toggle()),
  subscribe: (listener) => {
    let last = isOpen()
    let observed: ShadowRoot | null = null
    const shadowObserver = new MutationObserver(() => check())
    const check = () => {
      const shadow = hostShadow()
      if (shadow !== observed) {
        shadowObserver.disconnect()
        observed = shadow
        if (shadow !== null) {
          shadowObserver.observe(shadow, { childList: true, subtree: true })
        }
      }
      const next = isOpen()
      if (next !== last) {
        last = next
        listener(next)
      }
    }
    const bodyObserver = new MutationObserver(check)
    bodyObserver.observe(document.body, { childList: true })
    const unsubscribe = devToolsRegistry().subscribe(check)
    check()
    listener(last)
    return () => {
      shadowObserver.disconnect()
      bodyObserver.disconnect()
      unsubscribe()
    }
  },
}
