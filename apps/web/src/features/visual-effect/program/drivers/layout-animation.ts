import { Array } from "effect"
import { stopAll } from "./node-motion"
import { animate, type AnimationPlaybackControls } from "motion"
import { SPRINGS } from "@/lib/animation"

/**
 * Springs for the parts that move on their own: finalizer cards slide along
 * the panel, and the highlight box slides along the code. Each gets its target
 * from `apply` and writes styles. Everything here runs in the browser. A Mount
 * creates each one, and a Command changes its target.
 */

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

const numberOf = (element: Element, name: string, fallback: number): number => {
  const value = Number(element.getAttribute(name))
  return Number.isFinite(value) && element.hasAttribute(name) ? value : fallback
}

const part = (root: Element, name: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-layout="${name}"]`)

/** Stops the controls and empties the list. */
const stopAndClear = (controls: Array<AnimationPlaybackControls>): void => {
  stopAll(controls)
  controls.length = 0
}

const FLASH_BACKGROUND: Record<string, string> = {
  Succeeded:
    "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.3) 0%, transparent 70%)",
  Interrupted:
    "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.3) 0%, transparent 70%)",
  Failed:
    "radial-gradient(ellipse at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%)",
}

export interface CardInput {
  readonly x: number
  readonly scale: number
  readonly phase: string
}

export interface CardAnimation {
  readonly apply: (input: CardInput) => void
  readonly dispose: () => void
}

/** A finalizer card. `root` is the positioned wrapper. */
export const startCardAnimation = (
  root: HTMLElement,
  initial: CardInput,
): CardAnimation => {
  const card = part(root, "card")
  const iconPulse = part(root, "icon-pulse")
  const cardPulse = part(root, "card-pulse")
  const flash = part(root, "flash")
  const isReduced = prefersReducedMotion()
  const controls: Array<AnimationPlaybackControls> = []
  const pulses: Array<AnimationPlaybackControls> = []
  let phase = initial.phase
  let x = initial.x
  let scale = initial.scale

  const place = (): void => {
    root.style.transform = `translateX(${x}px) scale(${scale})`
  }
  place()

  if (card !== null && !isReduced) {
    controls.push(
      animate(
        card,
        {
          opacity: [0, 1],
          scale: [1.12, 1],
          filter: ["blur(4px)", "blur(0px)"],
        },
        { type: "spring", visualDuration: 0.3, bounce: 0.25 },
      ),
    )
  }

  const syncPulses = (): void => {
    stopAndClear(pulses)
    if (phase !== "Running" || isReduced) {
      return
    }
    if (iconPulse !== null) {
      pulses.push(
        animate(
          iconPulse,
          { scale: [1, 1.3, 1], opacity: [0.35, 0, 0.35] },
          { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        ),
      )
    }
    if (cardPulse !== null) {
      pulses.push(
        animate(
          cardPulse,
          { opacity: [0, 0.25, 0] },
          { duration: 2, repeat: Infinity, ease: "easeInOut" },
        ),
      )
    }
  }
  syncPulses()

  const flashOnCompletion = (next: string): void => {
    if (flash === null || isReduced || FLASH_BACKGROUND[next] === undefined) {
      return
    }
    flash.style.background = FLASH_BACKGROUND[next]
    controls.push(
      animate(
        flash,
        { opacity: [0.75, 0], scale: [1, 1.04] },
        { duration: 0.6, ease: "easeOut" },
      ),
    )
  }

  return {
    apply: (next) => {
      if (next.x !== x || next.scale !== scale) {
        x = next.x
        scale = next.scale
        controls.push(
          isReduced
            ? animate(root, { x, scale }, { duration: 0.08 })
            : animate(
                root,
                { x, scale },
                { type: "spring", visualDuration: 0.5, bounce: 0 },
              ),
        )
      }
      if (next.phase !== phase) {
        phase = next.phase
        syncPulses()
        flashOnCompletion(phase)
      }
    },
    dispose: () => {
      stopAndClear(controls)
      stopAndClear(pulses)
    },
  }
}

export interface HighlightInput {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly isVisible: boolean
}

export interface HighlightAnimation {
  readonly apply: (input: HighlightInput) => void
  readonly dispose: () => void
}

/** The box over the code a node stands for. It slides, and fades in and out. */
export const startHighlightAnimation = (
  root: HTMLElement,
  initial: HighlightInput,
): HighlightAnimation => {
  const isReduced = prefersReducedMotion()
  const controls: Array<AnimationPlaybackControls> = []

  const apply = ({ isVisible, ...target }: HighlightInput): void => {
    const options = isReduced ? ({ duration: 0.12 } as const) : SPRINGS.default
    if (isVisible) {
      controls.push(animate(root, target, { ...options, type: "spring" }))
    }
    controls.push(
      animate(
        root,
        { opacity: isVisible ? 1 : 0 },
        isReduced ? { duration: 0.12 } : { duration: 0.18, ease: "easeOut" },
      ),
    )
  }

  root.style.opacity = "0"
  root.style.transform = `translate(${initial.x}px, ${initial.y}px)`
  root.style.width = `${initial.width}px`
  root.style.height = `${initial.height}px`
  apply(initial)

  return { apply, dispose: () => stopAndClear(controls) }
}

/** The chevrons around "FINALIZERS" fade in turn. */
export const startChevronPulse = (root: HTMLElement): (() => void) => {
  if (prefersReducedMotion()) {
    return () => undefined
  }
  const controls = Array.map(
    Array.fromIterable(
      root.querySelectorAll<HTMLElement>('[data-layout="chevron"]'),
    ),
    (chevron) =>
      animate(
        chevron,
        { opacity: [0.2, 1, 0.2] },
        {
          duration: 2,
          repeat: Infinity,
          delay: numberOf(chevron, "data-index", 0) * 0.15,
          ease: "easeInOut",
        },
      ),
  )
  return () => stopAndClear(controls)
}
