import { animate, type AnimationPlaybackControls } from "motion"

/**
 * The play, stop and reset button. The tile grows when the pointer is on it
 * and shrinks when pressed. The icon turns in when the state changes. Until the
 * learner has used it, the whole button wiggles from time to time. It reads
 * `data-state` and `data-interacted` from the button. Everything here runs in
 * the browser, behind a Mount.
 */

const WIGGLE = [0, -8, 8, -6, 6, -3, 3, 0]

const part = (root: Element, name: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-header="${name}"]`)

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

type Tag = "Idle" | "Running" | "Succeeded" | "Failed" | "Interrupted" | "Died"

const tagOf = (root: Element): Tag => {
  const value = root.getAttribute("data-state")
  switch (value) {
    case "Running":
    case "Succeeded":
    case "Failed":
    case "Interrupted":
    case "Died":
      return value
    default:
      return "Idle"
  }
}

interface Keyframes {
  readonly from: Record<string, string | number>
  readonly to: Record<string, string | number>
  readonly duration: number
}

const filterOf = (blur: number): string => `blur(${blur}px)`

/** How the new icon arrives. */
const arrival = (
  tag: Tag,
  isHovered: boolean,
  isReduced: boolean,
): Keyframes => {
  if (isReduced) {
    return {
      from: { opacity: 0, scale: 1, rotate: 0, filter: filterOf(0) },
      to: { opacity: 1, scale: 1, rotate: 0, filter: filterOf(0) },
      duration: 0.08,
    }
  }
  if (tag === "Idle") {
    return isHovered
      ? {
          from: { opacity: 0, rotate: 0, scale: 1 },
          to: { opacity: 1, rotate: 360, scale: 1.05 },
          duration: 0.12,
        }
      : {
          from: { opacity: 0, scale: 0.8, rotate: 0, filter: filterOf(4) },
          to: { opacity: 1, scale: 1, rotate: 0, filter: filterOf(0) },
          duration: 0.14,
        }
  }
  return {
    from: { opacity: 0, scale: 0, rotate: -180, filter: filterOf(10) },
    to: { opacity: 1, scale: 1, rotate: 0, filter: filterOf(0) },
    duration: 0.14,
  }
}

export interface HeaderAnimation {
  readonly dispose: () => void
}

export const startHeaderAnimation = (root: HTMLElement): HeaderAnimation => {
  const wiggle = part(root, "wiggle")
  const tile = part(root, "tile")
  const icon = part(root, "icon")
  if (wiggle === null || tile === null || icon === null) {
    return { dispose: () => undefined }
  }

  let isHovered = false
  let isPressed = false
  let tag = tagOf(root)
  const controls: Array<AnimationPlaybackControls> = []
  let wiggling: AnimationPlaybackControls | undefined

  const isAttracting = (): boolean =>
    root.getAttribute("data-interacted") !== "true" &&
    !isHovered &&
    tag !== "Running" &&
    !prefersReducedMotion()

  const syncWiggle = (): void => {
    wiggling?.stop()
    wiggling = undefined
    if (isAttracting()) {
      wiggling = animate(
        wiggle,
        { rotate: WIGGLE },
        {
          duration: 0.6,
          ease: "easeInOut",
          delay: 2,
          repeat: Infinity,
          repeatDelay: 4,
        },
      )
    } else {
      controls.push(
        animate(wiggle, { rotate: 0 }, { duration: 0.15, ease: "easeOut" }),
      )
    }
  }

  const syncTile = (): void => {
    const scale = isPressed ? 0.95 : isHovered ? 1.05 : 1
    controls.push(
      prefersReducedMotion()
        ? animate(tile, { scale }, { duration: 0.08 })
        : animate(
            tile,
            { scale },
            { type: "spring", stiffness: 300, damping: 20 },
          ),
    )
  }

  const arrive = (): void => {
    const { from, to, duration } = arrival(
      tag,
      isHovered,
      prefersReducedMotion(),
    )
    controls.push(
      animate(icon, from, { duration: 0 }),
      animate(icon, to, { duration, ease: "easeOut", delay: 0.001 }),
    )
  }

  const on = <K extends keyof HTMLElementEventMap>(
    type: K,
    listener: () => void,
  ): (() => void) => {
    root.addEventListener(type, listener)
    return () => root.removeEventListener(type, listener)
  }
  const off = [
    on("mouseenter", () => {
      isHovered = true
      syncTile()
      syncWiggle()
    }),
    on("mouseleave", () => {
      isHovered = false
      isPressed = false
      syncTile()
      syncWiggle()
    }),
    on("mousedown", () => {
      isPressed = true
      syncTile()
    }),
    on("mouseup", () => {
      isPressed = false
      syncTile()
    }),
  ]

  const observer = new MutationObserver(() => {
    const next = tagOf(root)
    if (next !== tag) {
      tag = next
      arrive()
    }
    syncWiggle()
  })
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-state", "data-interacted"],
  })
  syncWiggle()

  return {
    dispose: () => {
      observer.disconnect()
      for (const remove of off) {
        remove()
      }
      wiggling?.stop()
      for (const control of controls) {
        control.stop()
      }
    },
  }
}
