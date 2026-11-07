import { stopAll, type NodeTag } from "./node-motion"
import { animate, type AnimationPlaybackControls } from "motion"

/**
 * The play, stop and reset button. The tile grows when the pointer is on it
 * and shrinks when pressed. The icon turns in when the state changes. Until the
 * learner has used it, the whole button wiggles from time to time. It gets
 * the state from `apply`. Everything here runs in the browser. A Mount creates
 * it, and a Command changes its state.
 */

const WIGGLE = [0, -8, 8, -6, 6, -3, 3, 0]

const part = (root: Element, name: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-header="${name}"]`)

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export type Pointer = "Away" | "Over" | "Pressed"

export interface HeaderInput {
  readonly tag: NodeTag
  readonly hasInteracted: boolean
  readonly pointer: Pointer
}

interface Keyframes {
  readonly from: Record<string, string | number>
  readonly to: Record<string, string | number>
  readonly duration: number
}

const filterOf = (blur: number): string => `blur(${blur}px)`

/** How the new icon arrives. */
const arrival = (
  tag: NodeTag,
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
  readonly apply: (input: HeaderInput) => void
  readonly dispose: () => void
}

export const startHeaderAnimation = (
  root: HTMLElement,
  initial: HeaderInput,
): HeaderAnimation => {
  const wiggle = part(root, "wiggle")
  const tile = part(root, "tile")
  const icon = part(root, "icon")
  if (wiggle === null || tile === null || icon === null) {
    return { apply: () => undefined, dispose: () => undefined }
  }

  let isHovered = initial.pointer !== "Away"
  let isPressed = initial.pointer === "Pressed"
  let tag = initial.tag
  let hasInteracted = initial.hasInteracted
  const controls: Array<AnimationPlaybackControls> = []
  let wiggling: AnimationPlaybackControls | undefined

  const isAttracting = (): boolean =>
    !hasInteracted && !isHovered && tag !== "Running" && !prefersReducedMotion()

  let wasAttracting = false
  const syncWiggle = (): void => {
    const attracting = isAttracting()
    if (attracting === wasAttracting) {
      return
    }
    wasAttracting = attracting
    wiggling?.stop()
    wiggling = undefined
    if (attracting) {
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

  syncWiggle()

  return {
    apply: (next) => {
      hasInteracted = next.hasInteracted
      if (next.tag !== tag) {
        tag = next.tag
        arrive()
      }
      const wasHovered = isHovered
      const wasPressed = isPressed
      isHovered = next.pointer !== "Away"
      isPressed = next.pointer === "Pressed"
      if (isHovered !== wasHovered || isPressed !== wasPressed) {
        syncTile()
      }
      syncWiggle()
    },
    dispose: () => {
      wiggling?.stop()
      stopAll(controls)
    },
  }
}
