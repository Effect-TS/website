import { animate, type AnimationPlaybackControls } from "motion"
import { SPRINGS } from "@/lib/animation"

/**
 * Springs for the parts that move on their own: finalizer cards slide along
 * the panel, and the highlight box slides along the code. Each reads its target
 * from data attributes and writes styles. Everything here runs in the browser,
 * behind a Mount.
 */

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

const numberOf = (element: Element, name: string, fallback: number): number => {
  const value = Number(element.getAttribute(name))
  return Number.isFinite(value) && element.hasAttribute(name) ? value : fallback
}

const part = (root: Element, name: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-layout="${name}"]`)

const stopAll = (controls: Array<AnimationPlaybackControls>): void => {
  for (const control of controls) {
    control.stop()
  }
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

/** A finalizer card. `root` is the positioned wrapper. */
export const startCardAnimation = (root: HTMLElement): (() => void) => {
  const card = part(root, "card")
  const iconPulse = part(root, "icon-pulse")
  const cardPulse = part(root, "card-pulse")
  const flash = part(root, "flash")
  const isReduced = prefersReducedMotion()
  const controls: Array<AnimationPlaybackControls> = []
  const pulses: Array<AnimationPlaybackControls> = []
  let phase = root.getAttribute("data-phase") ?? "Pending"
  let x = numberOf(root, "data-x", 0)
  let scale = numberOf(root, "data-scale", 1)

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
    stopAll(pulses)
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

  const observer = new MutationObserver(() => {
    const nextX = numberOf(root, "data-x", x)
    const nextScale = numberOf(root, "data-scale", scale)
    if (nextX !== x || nextScale !== scale) {
      x = nextX
      scale = nextScale
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
    const nextPhase = root.getAttribute("data-phase") ?? phase
    if (nextPhase !== phase) {
      phase = nextPhase
      syncPulses()
      flashOnCompletion(nextPhase)
    }
  })
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-x", "data-scale", "data-phase"],
  })

  return () => {
    observer.disconnect()
    stopAll(controls)
    stopAll(pulses)
  }
}

/** The box over the code a node stands for. It slides, and fades with `data-visible`. */
export const startHighlightAnimation = (root: HTMLElement): (() => void) => {
  const isReduced = prefersReducedMotion()
  const controls: Array<AnimationPlaybackControls> = []
  let isShown = false

  const sync = (): void => {
    const target = {
      x: numberOf(root, "data-x", 0),
      y: numberOf(root, "data-y", 0),
      width: numberOf(root, "data-width", 0),
      height: numberOf(root, "data-height", 0),
    }
    const isVisible = root.getAttribute("data-visible") === "true"
    const options = isReduced ? ({ duration: 0.12 } as const) : SPRINGS.default
    if (!isShown) {
      root.style.transform = `translate(${target.x}px, ${target.y}px)`
      root.style.width = `${target.width}px`
      root.style.height = `${target.height}px`
      isShown = true
    } else if (isVisible) {
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
  sync()

  const observer = new MutationObserver(sync)
  observer.observe(root, {
    attributes: true,
    attributeFilter: [
      "data-x",
      "data-y",
      "data-width",
      "data-height",
      "data-visible",
    ],
  })
  return () => {
    observer.disconnect()
    stopAll(controls)
  }
}

/** The chevrons around "FINALIZERS" fade in turn. */
export const startChevronPulse = (root: HTMLElement): (() => void) => {
  if (prefersReducedMotion()) {
    return () => undefined
  }
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>('[data-layout="chevron"]'),
  ).map((chevron) =>
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
  return () => stopAll(controls)
}
