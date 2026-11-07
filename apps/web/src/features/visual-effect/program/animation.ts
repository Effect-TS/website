import {
  animate,
  motionValue,
  springValue,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion"
import { COLORS, SHADOW_COLORS, SPRINGS, TIMINGS, VFX } from "@/lib/animation"

/**
 * The look of a node that CSS cannot give: springs, jitter, shake, glitch and
 * flash. One `Animation` drives one node. It gets the state from `apply` and
 * writes styles on the node's parts. Everything here runs in the browser.
 * A Mount creates it, and a Command changes its state.
 */

export type NodeTag =
  | "Idle"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Died"
  | "Interrupted"

export const NODE_PARTS = {
  outer: "outer",
  container: "container",
  content: "content",
  ring: "ring",
  flash: "flash",
  shimmer: "shimmer",
} as const

const BASE_NODE_SIZE = 56
const RUNNING_NODE_HEIGHT = BASE_NODE_SIZE * 0.4
const BASE_BORDER_RADIUS = 8
const RUNNING_BORDER_RADIUS = 15
const SUCCESS_WIDTH_PADDING = 24
const MIN_MEASURED_WIDTH = 40

const RUNNING_ANGLE_RANGE = 4
const RUNNING_ANGLE_BASE = 0.5
const RUNNING_OFFSET_X_RANGE = 1.5
const RUNNING_OFFSET_X_BASE = 0.5
const RUNNING_OFFSET_Y_RANGE = 0.6
const RUNNING_OFFSET_Y_BASE = 0.1
const RUNNING_DURATION_MIN_SEC = 0.1
const RUNNING_DURATION_MAX_SEC = 0.2

const FAILURE_SHAKE_INTENSITY = 8
const FAILURE_SHAKE_STEP_DURATION_SEC = 0.08
const FAILURE_SHAKE_COUNT = 6
const FAILURE_SHAKE_ROTATION_RANGE = 8
const FAILURE_SHAKE_RETURN_DURATION_SEC = 0.3

const GLITCH_INITIAL_COUNT = 3
const GLITCH_INITIAL_DELAY_MIN_MS = 20
const GLITCH_INITIAL_DELAY_MAX_MS = 70
const GLITCH_PAUSE_MIN_MS = 50
const GLITCH_PAUSE_MAX_MS = 150
const GLITCH_SUBTLE_DELAY_MIN_MS = 300
const GLITCH_SUBTLE_DELAY_MAX_MS = 800
const GLITCH_SCALE_RANGE = 0.2
const GLITCH_GLOW_MIN = 3
const GLITCH_GLOW_MAX = 7
const GLITCH_INTENSE_PULSE_MAX = 10

const SHIMMER_DELAYS = [0, 0.2, 0.4, 0.6, 0.8, 1] as const

const randomBetween = (minimum: number, maximum: number): number =>
  minimum + Math.random() * Math.max(0, maximum - minimum)

const randomSign = (): 1 | -1 => (Math.random() < 0.5 ? 1 : -1)

const part = (root: Element, name: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-node="${name}"]`)

const parts = (root: Element, name: string): ReadonlyArray<HTMLElement> =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-node="${name}"]`))

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

interface Motion {
  readonly nodeWidth: MotionValue<number>
  readonly nodeHeight: MotionValue<number>
  readonly contentOpacity: MotionValue<number>
  readonly contentScale: MotionValue<number>
  readonly flashOpacity: MotionValue<number>
  readonly borderOpacity: MotionValue<number>
  readonly borderRadius: MotionValue<number>
  readonly glowIntensity: MotionValue<number>
  readonly rotation: MotionValue<number>
  readonly shakeX: MotionValue<number>
  readonly shakeY: MotionValue<number>
}

const makeMotion = (): Motion => ({
  nodeWidth: springValue<number>(BASE_NODE_SIZE, SPRINGS.nodeWidth),
  nodeHeight: springValue<number>(BASE_NODE_SIZE, SPRINGS.default),
  contentOpacity: springValue<number>(1, SPRINGS.default),
  contentScale: springValue<number>(1, SPRINGS.default),
  flashOpacity: motionValue<number>(0),
  borderOpacity: springValue<number>(1, SPRINGS.default),
  borderRadius: springValue<number>(BASE_BORDER_RADIUS, SPRINGS.default),
  glowIntensity: springValue<number>(0, SPRINGS.default),
  rotation: motionValue<number>(0),
  shakeX: motionValue<number>(0),
  shakeY: motionValue<number>(0),
})

export interface Animation {
  readonly apply: (tag: NodeTag) => void
  readonly dispose: () => void
}

const noAnimation: Animation = {
  apply: () => undefined,
  dispose: () => undefined,
}

/** Starts the animation of the node. `root` holds the node's parts. */
export const startAnimation = (
  root: HTMLElement,
  initial: NodeTag,
): Animation => {
  const outer = part(root, NODE_PARTS.outer)
  const container = part(root, NODE_PARTS.container)
  const content = part(root, NODE_PARTS.content)
  if (outer === null || container === null || content === null) {
    return noAnimation
  }

  const values = makeMotion()
  let tag = initial
  let previousTag: NodeTag = tag
  let cleanup: () => void = () => undefined

  const writeWidth = (width: number): void => {
    outer.style.width = `${width}px`
    container.style.width = `${width}px`
  }
  const writeTransform = (): void => {
    container.style.transform = `translate(${values.shakeX.get()}px, ${values.shakeY.get()}px) rotate(${values.rotation.get()}deg) translateZ(0)`
  }
  let blur = 0
  let lastRotation = 0
  let lastRotationAt = performance.now()
  let blurTimer: ReturnType<typeof setTimeout> | undefined
  const writeFilter = (): void => {
    container.style.filter =
      tag === "Died"
        ? `blur(${blur}px) contrast(${VFX.contrast.death}) brightness(${VFX.brightness.death})`
        : `blur(${blur}px)`
  }
  /** Blur follows how fast the node turns, and drops to none a moment after it stops. */
  const followRotation = (rotation: number): void => {
    const now = performance.now()
    const elapsed = Math.max(1, now - lastRotationAt)
    blur = Math.min((Math.abs(rotation - lastRotation) / elapsed) * 10, 1)
    lastRotation = rotation
    lastRotationAt = now
    writeFilter()
    if (blurTimer !== undefined) {
      clearTimeout(blurTimer)
    }
    blurTimer = setTimeout(() => {
      blur = 0
      writeFilter()
    }, 60)
  }
  const writeShadow = (): void => {
    const base =
      tag === "Running" ? SHADOW_COLORS.task.running : SHADOW_COLORS.small
    const glow = Math.min(values.glowIntensity.get(), 8)
    container.style.boxShadow =
      tag === "Died"
        ? glow > 0
          ? `${base}, 0 0 ${glow * 2}px ${COLORS.glow.death}`
          : base
        : glow > 0
          ? `${base}, 0 0 ${glow}px ${COLORS.glow.running}`
          : base
  }
  const writeRing = (): void => {
    for (const ring of parts(root, NODE_PARTS.ring)) {
      ring.style.opacity = String(values.borderOpacity.get())
      ring.style.borderRadius = `${values.borderRadius.get()}px`
    }
  }
  const writeFlash = (): void => {
    for (const flash of parts(root, NODE_PARTS.flash)) {
      flash.style.opacity = String(values.flashOpacity.get())
    }
  }

  const subscriptions = [
    values.nodeWidth.on("change", writeWidth),
    values.nodeHeight.on("change", (height) => {
      container.style.height = `${height}px`
    }),
    values.borderRadius.on("change", (radius) => {
      container.style.borderRadius = `${radius}px`
      writeRing()
    }),
    values.contentOpacity.on("change", (opacity) => {
      content.style.opacity = String(opacity)
    }),
    values.contentScale.on("change", (scale) => {
      content.style.scale = String(scale)
    }),
    values.borderOpacity.on("change", writeRing),
    values.flashOpacity.on("change", writeFlash),
    values.glowIntensity.on("change", writeShadow),
    values.rotation.on("change", (rotation) => {
      writeTransform()
      followRotation(rotation)
    }),
    values.shakeX.on("change", writeTransform),
    values.shakeY.on("change", writeTransform),
  ]

  const apply = (): void => {
    cleanup()
    cleanup = run(root, content, values, tag, previousTag, () => {
      writeShadow()
      writeFilter()
      writeRing()
      writeFlash()
    })
  }

  // The server markup already has the Idle look, so nothing is written until the state changes.
  if (tag !== "Idle") {
    apply()
  }

  return {
    apply: (next) => {
      if (next === tag) {
        return
      }
      previousTag = tag
      tag = next
      apply()
    },
    dispose: () => {
      if (blurTimer !== undefined) {
        clearTimeout(blurTimer)
      }
      cleanup()
      for (const unsubscribe of subscriptions) {
        unsubscribe()
      }
    },
  }
}

const run = (
  root: HTMLElement,
  content: HTMLElement,
  values: Motion,
  tag: NodeTag,
  previousTag: NodeTag,
  refresh: () => void,
): (() => void) => {
  const controls: Array<AnimationPlaybackControls> = []
  let isActive = true
  let jitterFrame: number | null = null
  let jitterControls: Array<AnimationPlaybackControls> = []
  let glitchTimer: ReturnType<typeof setTimeout> | undefined

  const register = (control: AnimationPlaybackControls) => {
    controls.push(control)
    return control
  }
  const settled = (control: AnimationPlaybackControls): Promise<unknown> =>
    control.finished.catch(() => undefined)

  const isRunning = tag === "Running"
  const hasResult = tag === "Succeeded"
  const justStarted = previousTag !== "Running" && tag === "Running"
  const justCompleted = previousTag !== "Succeeded" && tag === "Succeeded"
  const justFailed = previousTag !== "Failed" && tag === "Failed"
  const justDied = previousTag !== "Died" && tag === "Died"

  values.borderRadius.set(
    isRunning ? RUNNING_BORDER_RADIUS : BASE_BORDER_RADIUS,
  )
  register(
    animate(
      values.nodeHeight,
      isRunning ? RUNNING_NODE_HEIGHT : BASE_NODE_SIZE,
      { duration: 0.4, bounce: isRunning ? 0.3 : 0.5, type: "spring" },
    ),
  )
  if (!hasResult) {
    values.nodeWidth.set(BASE_NODE_SIZE)
  }
  values.contentOpacity.set(isRunning ? 0 : 1)

  if (hasResult) {
    requestAnimationFrame(() => {
      const width = content.firstElementChild?.scrollWidth ?? 0
      if (isActive && width > MIN_MEASURED_WIDTH) {
        values.nodeWidth.set(width + SUCCESS_WIDTH_PADDING)
      }
    })
  }

  const stopJitter = (): void => {
    if (jitterFrame !== null) {
      cancelAnimationFrame(jitterFrame)
      jitterFrame = null
    }
    for (const control of jitterControls) {
      control.stop()
    }
    jitterControls = []
  }

  const reset = (): void => {
    isActive = false
    stopJitter()
    if (glitchTimer !== undefined) {
      clearTimeout(glitchTimer)
    }
    for (const control of controls) {
      control.stop()
    }
    values.glowIntensity.set(0)
    values.contentScale.set(1)
    values.rotation.set(0)
    values.shakeX.set(0)
    values.shakeY.set(0)
    values.flashOpacity.set(0)
  }

  if (prefersReducedMotion()) {
    values.flashOpacity.set(0)
    values.contentScale.set(1)
    values.borderOpacity.set(1)
    values.glowIntensity.set(0)
    values.rotation.set(0)
    values.shakeX.set(0)
    values.shakeY.set(0)
    refresh()
    return reset
  }

  if (tag !== "Running") {
    register(
      animate(values.borderOpacity, 1, {
        duration: TIMINGS.resetDurationSec,
        ease: "easeOut",
      }),
    )
  }
  if (tag !== "Running" && tag !== "Died") {
    register(
      animate(values.glowIntensity, 0, {
        duration: TIMINGS.resetDurationSec,
        ease: "easeOut",
      }),
    )
  }

  if (tag === "Running") {
    register(
      animate(values.borderOpacity, [1, 0.3, 1], {
        duration: TIMINGS.runningBorderPulseDurationSec,
        ease: "easeInOut",
        repeat: Infinity,
      }),
    )
    register(
      animate(values.glowIntensity, [1, 5, 1], {
        duration: TIMINGS.runningGlowPulseDurationSec,
        ease: "easeInOut",
        repeat: Infinity,
      }),
    )
    parts(root, NODE_PARTS.shimmer).forEach((shimmer, index) => {
      register(
        animate(
          shimmer,
          { x: ["-66%", "50%"] },
          {
            duration: 0.8,
            delay: SHIMMER_DELAYS[index] ?? 0,
            repeat: Infinity,
            ease: [0.5, 0, 0.1, 1],
          },
        ),
      )
    })

    const jitter = (): void => {
      if (!isActive) return
      const angle =
        (Math.random() * RUNNING_ANGLE_RANGE + RUNNING_ANGLE_BASE) *
        randomSign()
      const offsetX =
        (Math.random() * RUNNING_OFFSET_X_RANGE + RUNNING_OFFSET_X_BASE) *
        randomSign()
      const offsetY =
        (Math.random() * RUNNING_OFFSET_Y_RANGE + RUNNING_OFFSET_Y_BASE) *
        randomSign()
      const duration = randomBetween(
        RUNNING_DURATION_MIN_SEC,
        RUNNING_DURATION_MAX_SEC,
      )
      const rotation = animate(values.rotation, angle, {
        duration,
        ease: "circInOut",
      })
      const shakeX = animate(values.shakeX, offsetX, {
        duration,
        ease: "easeInOut",
      })
      const shakeY = animate(values.shakeY, offsetY, {
        duration,
        ease: "easeInOut",
      })
      jitterControls = [rotation, shakeX, shakeY]
      void Promise.all([
        settled(rotation),
        settled(shakeX),
        settled(shakeY),
      ]).then(() => {
        if (isActive) jitterFrame = requestAnimationFrame(jitter)
      })
    }
    jitterFrame = requestAnimationFrame(jitter)
  }

  if (justCompleted || justStarted) {
    if (justCompleted) {
      values.contentScale.set(0)
      register(animate(values.contentScale, [1.3, 1], SPRINGS.contentScale))
    }
    const flashIn = register(
      animate(values.flashOpacity, 0.6, {
        duration: TIMINGS.flashInDurationSec,
        ease: "circOut",
      }),
    )
    void flashIn.finished
      .then(() => {
        if (!isActive) return
        register(
          animate(values.flashOpacity, 0, {
            duration: TIMINGS.flashOutDurationSec,
            ease: "linear",
          }),
        )
      })
      .catch(() => undefined)
  }

  if (justFailed || justDied) {
    const shakeFor = async (): Promise<void> => {
      for (let step = 0; step < FAILURE_SHAKE_COUNT; step += 1) {
        if (!isActive) return
        const to = (range: number) => (Math.random() - 0.5) * range
        const options = {
          duration: FAILURE_SHAKE_STEP_DURATION_SEC,
          ease: "easeInOut",
        } as const
        await Promise.all([
          settled(
            register(
              animate(values.shakeX, to(FAILURE_SHAKE_INTENSITY), options),
            ),
          ),
          settled(
            register(
              animate(values.shakeY, to(FAILURE_SHAKE_INTENSITY), options),
            ),
          ),
          settled(
            register(
              animate(
                values.rotation,
                to(FAILURE_SHAKE_ROTATION_RANGE),
                options,
              ),
            ),
          ),
        ])
      }
      if (!isActive) return
      const back = {
        duration: FAILURE_SHAKE_RETURN_DURATION_SEC,
        ease: "easeOut",
      } as const
      await Promise.all([
        settled(register(animate(values.shakeX, 0, back))),
        settled(register(animate(values.shakeY, 0, back))),
        settled(register(animate(values.rotation, 0, back))),
      ])
    }
    void shakeFor()
  }

  if (tag === "Died") {
    const wait = (delayMs: number): Promise<void> =>
      new Promise((resolve) => {
        glitchTimer = setTimeout(() => {
          glitchTimer = undefined
          if (isActive) resolve()
        }, delayMs)
      })
    const glitch = async (): Promise<void> => {
      for (let pulse = 0; pulse < GLITCH_INITIAL_COUNT; pulse += 1) {
        if (!isActive) return
        values.contentScale.set(1 + Math.random() * GLITCH_SCALE_RANGE)
        values.glowIntensity.set(Math.random() * GLITCH_INTENSE_PULSE_MAX)
        await wait(
          randomBetween(
            GLITCH_INITIAL_DELAY_MIN_MS,
            GLITCH_INITIAL_DELAY_MAX_MS,
          ),
        )
        if (!isActive) return
        values.contentScale.set(1)
        values.glowIntensity.set(GLITCH_GLOW_MAX)
        await wait(randomBetween(GLITCH_PAUSE_MIN_MS, GLITCH_PAUSE_MAX_MS))
      }
      const subtle = (): void => {
        if (!isActive) return
        values.glowIntensity.set(
          randomBetween(GLITCH_GLOW_MIN, GLITCH_GLOW_MAX),
        )
        glitchTimer = setTimeout(
          subtle,
          randomBetween(GLITCH_SUBTLE_DELAY_MIN_MS, GLITCH_SUBTLE_DELAY_MAX_MS),
        )
      }
      subtle()
    }
    void glitch()
  }

  if (tag === "Interrupted") {
    const options = {
      duration: TIMINGS.resetDurationSec,
      ease: "easeOut",
    } as const
    register(animate(values.rotation, 0, options))
    register(animate(values.shakeX, 0, options))
    register(animate(values.shakeY, 0, options))
  }

  refresh()
  return reset
}
