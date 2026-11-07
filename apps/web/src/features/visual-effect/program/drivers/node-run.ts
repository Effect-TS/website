import { Array } from "effect"
import { animate, type AnimationPlaybackControls } from "motion"
import { TIMINGS, SPRINGS } from "@/lib/animation"
import {
  BASE_BORDER_RADIUS,
  BASE_NODE_SIZE,
  FAILURE_SHAKE_COUNT,
  FAILURE_SHAKE_INTENSITY,
  FAILURE_SHAKE_RETURN_DURATION_SEC,
  FAILURE_SHAKE_ROTATION_RANGE,
  FAILURE_SHAKE_STEP_DURATION_SEC,
  GLITCH_GLOW_MAX,
  GLITCH_GLOW_MIN,
  GLITCH_INITIAL_COUNT,
  GLITCH_INITIAL_DELAY_MAX_MS,
  GLITCH_INITIAL_DELAY_MIN_MS,
  GLITCH_INTENSE_PULSE_MAX,
  GLITCH_PAUSE_MAX_MS,
  GLITCH_PAUSE_MIN_MS,
  GLITCH_SCALE_RANGE,
  GLITCH_SUBTLE_DELAY_MAX_MS,
  GLITCH_SUBTLE_DELAY_MIN_MS,
  MIN_MEASURED_WIDTH,
  NODE_PARTS,
  RUNNING_ANGLE_BASE,
  RUNNING_ANGLE_RANGE,
  RUNNING_BORDER_RADIUS,
  RUNNING_DURATION_MAX_SEC,
  RUNNING_DURATION_MIN_SEC,
  RUNNING_NODE_HEIGHT,
  RUNNING_OFFSET_X_BASE,
  RUNNING_OFFSET_X_RANGE,
  RUNNING_OFFSET_Y_BASE,
  RUNNING_OFFSET_Y_RANGE,
  SHIMMER_DELAYS,
  SUCCESS_WIDTH_PADDING,
  parts,
  prefersReducedMotion,
  randomBetween,
  randomSign,
  stopAll,
  type Motion,
  type NodeTag,
} from "./node-motion"

/**
 * What one state change of a node sets going. `isActive` goes false when the
 * next change replaces it. Every part below stops when it does.
 */
interface Session {
  readonly root: HTMLElement
  readonly values: Motion
  readonly register: (
    control: AnimationPlaybackControls,
  ) => AnimationPlaybackControls
  readonly settled: (control: AnimationPlaybackControls) => Promise<unknown>
  readonly isActive: () => boolean
  readonly setTimer: (timer: ReturnType<typeof setTimeout> | undefined) => void
}

const settledOf = (control: AnimationPlaybackControls): Promise<unknown> =>
  control.finished.catch(() => undefined)

/** The node shrinks to a pill while it runs, and grows to fit its result. */
const sizeNode = (
  { values, register }: Session,
  content: HTMLElement,
  tag: NodeTag,
  isActive: () => boolean,
): void => {
  const isRunning = tag === "Running"
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
  if (tag !== "Succeeded") {
    values.nodeWidth.set(BASE_NODE_SIZE)
  }
  values.contentOpacity.set(isRunning ? 0 : 1)
  if (tag === "Succeeded") {
    requestAnimationFrame(() => {
      const width = content.firstElementChild?.scrollWidth ?? 0
      if (isActive() && width > MIN_MEASURED_WIDTH) {
        values.nodeWidth.set(width + SUCCESS_WIDTH_PADDING)
      }
    })
  }
}

/** The border and the glow pulse while the node runs, and ease back when it stops. */
const pulse = ({ values, register }: Session, tag: NodeTag): void => {
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
  }
}

/** Light sweeps over a running node. */
const shimmer = ({ root, register }: Session): void => {
  Array.forEach(parts(root, NODE_PARTS.shimmer), (element, index) => {
    register(
      animate(
        element,
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
}

/** A running node trembles a little. It returns a function that stops the trembling. */
const jitter = ({ values, isActive, settled }: Session): (() => void) => {
  let frame: number | null = null
  let controls: Array<AnimationPlaybackControls> = []
  const step = (): void => {
    if (!isActive()) return
    const duration = randomBetween(
      RUNNING_DURATION_MIN_SEC,
      RUNNING_DURATION_MAX_SEC,
    )
    const rotation = animate(
      values.rotation,
      (Math.random() * RUNNING_ANGLE_RANGE + RUNNING_ANGLE_BASE) * randomSign(),
      { duration, ease: "circInOut" },
    )
    const shakeX = animate(
      values.shakeX,
      (Math.random() * RUNNING_OFFSET_X_RANGE + RUNNING_OFFSET_X_BASE) *
        randomSign(),
      { duration, ease: "easeInOut" },
    )
    const shakeY = animate(
      values.shakeY,
      (Math.random() * RUNNING_OFFSET_Y_RANGE + RUNNING_OFFSET_Y_BASE) *
        randomSign(),
      { duration, ease: "easeInOut" },
    )
    controls = [rotation, shakeX, shakeY]
    void Promise.all(Array.map(controls, settled)).then(() => {
      if (isActive()) frame = requestAnimationFrame(step)
    })
  }
  frame = requestAnimationFrame(step)
  return () => {
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
    stopAll(controls)
    controls = []
  }
}

/** A node that starts or completes flashes white, and a result pops in. */
const flash = (
  { values, register, isActive }: Session,
  justCompleted: boolean,
): void => {
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
      if (!isActive()) return
      register(
        animate(values.flashOpacity, 0, {
          duration: TIMINGS.flashOutDurationSec,
          ease: "linear",
        }),
      )
    })
    .catch(() => undefined)
}

/** A node that failed or died shakes hard, then settles. */
const shake = async ({
  values,
  register,
  settled,
  isActive,
}: Session): Promise<void> => {
  for (let step = 0; step < FAILURE_SHAKE_COUNT; step += 1) {
    if (!isActive()) return
    const to = (range: number) => (Math.random() - 0.5) * range
    const options = {
      duration: FAILURE_SHAKE_STEP_DURATION_SEC,
      ease: "easeInOut",
    } as const
    await Promise.all([
      settled(
        register(animate(values.shakeX, to(FAILURE_SHAKE_INTENSITY), options)),
      ),
      settled(
        register(animate(values.shakeY, to(FAILURE_SHAKE_INTENSITY), options)),
      ),
      settled(
        register(
          animate(values.rotation, to(FAILURE_SHAKE_ROTATION_RANGE), options),
        ),
      ),
    ])
  }
  if (!isActive()) return
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

/** A dead node glitches: a burst of flickers, then a slow, uneven glow. */
const glitch = async ({
  values,
  isActive,
  setTimer,
}: Session): Promise<void> => {
  const wait = (delayMs: number): Promise<void> =>
    new Promise((resolve) => {
      setTimer(
        setTimeout(() => {
          setTimer(undefined)
          if (isActive()) resolve()
        }, delayMs),
      )
    })
  for (let pulses = 0; pulses < GLITCH_INITIAL_COUNT; pulses += 1) {
    if (!isActive()) return
    values.contentScale.set(1 + Math.random() * GLITCH_SCALE_RANGE)
    values.glowIntensity.set(Math.random() * GLITCH_INTENSE_PULSE_MAX)
    await wait(
      randomBetween(GLITCH_INITIAL_DELAY_MIN_MS, GLITCH_INITIAL_DELAY_MAX_MS),
    )
    if (!isActive()) return
    values.contentScale.set(1)
    values.glowIntensity.set(GLITCH_GLOW_MAX)
    await wait(randomBetween(GLITCH_PAUSE_MIN_MS, GLITCH_PAUSE_MAX_MS))
  }
  const subtle = (): void => {
    if (!isActive()) return
    values.glowIntensity.set(randomBetween(GLITCH_GLOW_MIN, GLITCH_GLOW_MAX))
    setTimer(
      setTimeout(
        subtle,
        randomBetween(GLITCH_SUBTLE_DELAY_MIN_MS, GLITCH_SUBTLE_DELAY_MAX_MS),
      ),
    )
  }
  subtle()
}

/** An interrupted node stops moving. */
const calm = ({ values, register }: Session): void => {
  const options = {
    duration: TIMINGS.resetDurationSec,
    ease: "easeOut",
  } as const
  register(animate(values.rotation, 0, options))
  register(animate(values.shakeX, 0, options))
  register(animate(values.shakeY, 0, options))
}

/**
 * Sets the motion of one state going. It returns a function that stops it,
 * which the next state change calls first.
 */
export const run = (
  root: HTMLElement,
  content: HTMLElement,
  values: Motion,
  tag: NodeTag,
  previousTag: NodeTag,
  refresh: () => void,
): (() => void) => {
  const controls: Array<AnimationPlaybackControls> = []
  let isActive = true
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopJitter: () => void = () => undefined

  const session: Session = {
    root,
    values,
    register: (control) => {
      controls.push(control)
      return control
    },
    settled: settledOf,
    isActive: () => isActive,
    setTimer: (next) => {
      timer = next
    },
  }

  const reset = (): void => {
    isActive = false
    stopJitter()
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    stopAll(controls)
    values.glowIntensity.set(0)
    values.contentScale.set(1)
    values.rotation.set(0)
    values.shakeX.set(0)
    values.shakeY.set(0)
    values.flashOpacity.set(0)
  }

  sizeNode(session, content, tag, session.isActive)

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

  pulse(session, tag)
  if (tag === "Running") {
    shimmer(session)
    stopJitter = jitter(session)
  }
  const justStarted = previousTag !== "Running" && tag === "Running"
  const justCompleted = previousTag !== "Succeeded" && tag === "Succeeded"
  if (justStarted || justCompleted) {
    flash(session, justCompleted)
  }
  if (
    (previousTag !== "Failed" && tag === "Failed") ||
    (previousTag !== "Died" && tag === "Died")
  ) {
    void shake(session)
  }
  if (tag === "Died") {
    void glitch(session)
  }
  if (tag === "Interrupted") {
    calm(session)
  }

  refresh()
  return reset
}
