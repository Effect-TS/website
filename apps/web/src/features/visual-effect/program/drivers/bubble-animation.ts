import { prefersReducedMotion, stopAll } from "./node-motion"
import { animate, type AnimationPlaybackControls } from "motion"

interface Shake {
  readonly stepCount: number
  readonly stepDurationSec: number
  readonly returnDurationSec: number
  readonly xRangePx: number
  readonly yRangePx: number
  readonly rotationRangeDeg: number
  readonly baseYPx: number
  readonly startDelayMs: number
}

/** A failure or a death bubble shakes each time it shows. */
const SHAKE: Shake = {
  stepCount: 6,
  stepDurationSec: 0.05,
  returnDurationSec: 0.12,
  xRangePx: 10,
  yRangePx: 8,
  rotationRangeDeg: 5,
  baseYPx: -2,
  startDelayMs: 120,
}

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min)

export const startBubbleShake = (element: HTMLElement): (() => void) => {
  const shake = SHAKE
  const place = (x: number, y: number, rotate: number): string =>
    `translate(${x}px, ${y}px) rotate(${rotate}deg)`
  element.style.transform = place(0, shake.baseYPx, 0)

  if (prefersReducedMotion()) {
    return () => undefined
  }

  let isActive = true
  const controls: Array<AnimationPlaybackControls> = []
  const step = (
    x: number,
    y: number,
    rotate: number,
    duration: number,
    ease: "easeInOut" | "easeOut",
  ): Promise<unknown> => {
    const control = animate(
      element,
      { transform: place(x, y, rotate) },
      { duration, ease },
    )
    controls.push(control)
    return control.finished.catch(() => undefined)
  }

  const run = async (): Promise<void> => {
    for (let index = 0; index < shake.stepCount; index += 1) {
      if (!isActive) return
      await step(
        randomBetween(-shake.xRangePx / 2, shake.xRangePx / 2),
        shake.baseYPx + randomBetween(-shake.yRangePx / 2, shake.yRangePx / 2),
        randomBetween(-shake.rotationRangeDeg / 2, shake.rotationRangeDeg / 2),
        shake.stepDurationSec,
        "easeInOut",
      )
    }
    if (!isActive) return
    await step(0, shake.baseYPx, 0, shake.returnDurationSec, "easeOut")
  }

  const timer = setTimeout(() => {
    if (isActive) void run()
  }, shake.startDelayMs)

  return () => {
    isActive = false
    clearTimeout(timer)
    stopAll(controls)
  }
}

export interface BubbleAnimation {
  readonly apply: (isVisible: boolean) => void
  readonly dispose: () => void
}

/** Shakes the bubble when it shows, at first or again later. A Mount creates it, and a Command shows or hides it. */
export const startBubble = (
  element: HTMLElement,
  isVisible: boolean,
): BubbleAnimation => {
  let stop: () => void = () => undefined
  let wasVisible = false
  const apply = (next: boolean): void => {
    if (next === wasVisible) {
      return
    }
    wasVisible = next
    stop()
    stop = next ? startBubbleShake(element) : () => undefined
  }
  apply(isVisible)
  return { apply, dispose: () => stop() }
}
