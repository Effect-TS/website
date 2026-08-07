import {
  animate,
  type AnimationPlaybackControls,
  type AnimationScope,
  useReducedMotion,
} from "motion/react"
import { useCallback, useEffect, useRef } from "react"
import type { VisualEffectState } from "@/features/visual-effect/model/domain"
import { SPRINGS, TIMINGS } from "@/lib/animation"
import type { EffectMotionValues } from "./useEffectMotionValues"
import type { TransitionFlags } from "./useNodeTransitionFlags"

interface NodeAnimationControllerInput {
  readonly scope: AnimationScope
  readonly motion: EffectMotionValues
  readonly tag: VisualEffectState["_tag"]
  readonly transition: TransitionFlags
}

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

const BASE_NODE_SIZE = 56
const RUNNING_NODE_HEIGHT = BASE_NODE_SIZE * 0.4
const BASE_BORDER_RADIUS = 8

const randomBetween = (minimum: number, maximum: number): number =>
  minimum + Math.random() * Math.max(0, maximum - minimum)

export const useEffectNodeAnimationController = ({
  motion,
  tag,
  transition,
}: NodeAnimationControllerInput): void => {
  const prefersReducedMotion = useReducedMotion() === true

  const controlsRef = useRef<Array<AnimationPlaybackControls>>([])
  const runIdRef = useRef(0)

  const stopAll = useCallback(() => {
    for (const control of controlsRef.current) {
      control.stop()
    }
    controlsRef.current = []
  }, [])

  useEffect(() => {
    runIdRef.current += 1
    const runId = runIdRef.current

    const isActive = (): boolean => runIdRef.current === runId

    const registerControl = (control: AnimationPlaybackControls) => {
      controlsRef.current.push(control)
      return control
    }

    let runningJitterCancelled = false
    let runningJitterFrame: number | null = null
    let runningJitterControls: Array<AnimationPlaybackControls> = []
    let deathGlitchTimer: ReturnType<typeof setTimeout> | undefined

    const stopRunningJitter = () => {
      runningJitterCancelled = true
      if (runningJitterFrame !== null) {
        cancelAnimationFrame(runningJitterFrame)
        runningJitterFrame = null
      }

      for (const control of runningJitterControls) {
        control.stop()
      }
      runningJitterControls = []
    }

    const clearDeathGlitchTimer = () => {
      if (deathGlitchTimer === undefined) return
      clearTimeout(deathGlitchTimer)
      deathGlitchTimer = undefined
    }

    stopAll()

    const isRunning = tag === "Running"
    const hasResult = tag === "Succeeded"

    motion.borderRadius.set(isRunning ? 15 : BASE_BORDER_RADIUS)

    registerControl(
      animate(
        motion.nodeHeight,
        isRunning ? RUNNING_NODE_HEIGHT : BASE_NODE_SIZE,
        {
          duration: 0.4,
          bounce: isRunning ? 0.3 : 0.5,
          type: "spring",
        },
      ),
    )

    if (!hasResult) {
      motion.nodeWidth.set(BASE_NODE_SIZE)
    }

    motion.contentOpacity.set(isRunning ? 0 : 1)

    if (prefersReducedMotion) {
      motion.flashOpacity.set(0)
      motion.contentScale.set(1)
      motion.borderOpacity.set(1)
      motion.glowIntensity.set(0)
      motion.rotation.set(0)
      motion.shakeX.set(0)
      motion.shakeY.set(0)

      return () => {
        runIdRef.current += 1
        stopRunningJitter()
        clearDeathGlitchTimer()
        stopAll()
      }
    }

    if (tag !== "Running") {
      registerControl(
        animate(motion.borderOpacity, 1, {
          duration: TIMINGS.resetDurationSec,
          ease: "easeOut",
        }),
      )
    }

    if (tag !== "Running" && tag !== "Died") {
      registerControl(
        animate(motion.glowIntensity, 0, {
          duration: TIMINGS.resetDurationSec,
          ease: "easeOut",
        }),
      )
    }

    if (tag === "Running") {
      registerControl(
        animate(motion.borderOpacity, [1, 0.3, 1], {
          duration: TIMINGS.runningBorderPulseDurationSec,
          ease: "easeInOut",
          repeat: Infinity,
        }),
      )
      registerControl(
        animate(motion.glowIntensity, [1, 5, 1], {
          duration: TIMINGS.runningGlowPulseDurationSec,
          ease: "easeInOut",
          repeat: Infinity,
        }),
      )

      const runRunningJitter = () => {
        if (runningJitterCancelled || !isActive()) return

        const angle =
          (Math.random() * RUNNING_ANGLE_RANGE + RUNNING_ANGLE_BASE) *
          (Math.random() < 0.5 ? 1 : -1)

        const offsetX =
          (Math.random() * RUNNING_OFFSET_X_RANGE + RUNNING_OFFSET_X_BASE) *
          (Math.random() < 0.5 ? -1 : 1)

        const offsetY =
          (Math.random() * RUNNING_OFFSET_Y_RANGE + RUNNING_OFFSET_Y_BASE) *
          (Math.random() < 0.5 ? -1 : 1)

        const duration =
          RUNNING_DURATION_MIN_SEC +
          Math.random() * (RUNNING_DURATION_MAX_SEC - RUNNING_DURATION_MIN_SEC)

        const rotationControl = animate(motion.rotation, angle, {
          duration,
          ease: "circInOut",
        })

        const shakeXControl = animate(motion.shakeX, offsetX, {
          duration,
          ease: "easeInOut",
        })

        const shakeYControl = animate(motion.shakeY, offsetY, {
          duration,
          ease: "easeInOut",
        })

        runningJitterControls = [rotationControl, shakeXControl, shakeYControl]

        void Promise.all([
          rotationControl.finished.catch(() => undefined),
          shakeXControl.finished.catch(() => undefined),
          shakeYControl.finished.catch(() => undefined),
        ]).then(() => {
          if (runningJitterCancelled || !isActive()) return
          runningJitterFrame = requestAnimationFrame(runRunningJitter)
        })
      }

      runningJitterFrame = requestAnimationFrame(runRunningJitter)
    }

    if (transition.justCompleted || transition.justStarted) {
      if (transition.justCompleted) {
        motion.contentScale.set(0)
        registerControl(
          animate(motion.contentScale, [1.3, 1], SPRINGS.contentScale),
        )
      }

      const flashIn = registerControl(
        animate(motion.flashOpacity, 0.6, {
          duration: TIMINGS.flashInDurationSec,
          ease: "circOut",
        }),
      )

      void flashIn.finished
        .then(() => {
          if (!isActive()) return
          registerControl(
            animate(motion.flashOpacity, 0, {
              duration: TIMINGS.flashOutDurationSec,
              ease: "linear",
            }),
          )
        })
        .catch(() => {})
    }

    if (transition.justFailed || transition.justDied) {
      const runFailureShake = async (): Promise<void> => {
        for (let step = 0; step < FAILURE_SHAKE_COUNT; step += 1) {
          if (!isActive()) return

          const shakeX = (Math.random() - 0.5) * FAILURE_SHAKE_INTENSITY
          const shakeY = (Math.random() - 0.5) * FAILURE_SHAKE_INTENSITY
          const rotation = (Math.random() - 0.5) * FAILURE_SHAKE_ROTATION_RANGE

          const shakeXControl = registerControl(
            animate(motion.shakeX, shakeX, {
              duration: FAILURE_SHAKE_STEP_DURATION_SEC,
              ease: "easeInOut",
            }),
          )
          const shakeYControl = registerControl(
            animate(motion.shakeY, shakeY, {
              duration: FAILURE_SHAKE_STEP_DURATION_SEC,
              ease: "easeInOut",
            }),
          )
          const rotationControl = registerControl(
            animate(motion.rotation, rotation, {
              duration: FAILURE_SHAKE_STEP_DURATION_SEC,
              ease: "easeInOut",
            }),
          )

          await Promise.all([
            shakeXControl.finished.catch(() => undefined),
            shakeYControl.finished.catch(() => undefined),
            rotationControl.finished.catch(() => undefined),
          ])
        }

        if (!isActive()) return

        const settleXControl = registerControl(
          animate(motion.shakeX, 0, {
            duration: FAILURE_SHAKE_RETURN_DURATION_SEC,
            ease: "easeOut",
          }),
        )
        const settleYControl = registerControl(
          animate(motion.shakeY, 0, {
            duration: FAILURE_SHAKE_RETURN_DURATION_SEC,
            ease: "easeOut",
          }),
        )
        const settleRotationControl = registerControl(
          animate(motion.rotation, 0, {
            duration: FAILURE_SHAKE_RETURN_DURATION_SEC,
            ease: "easeOut",
          }),
        )

        await Promise.all([
          settleXControl.finished.catch(() => undefined),
          settleYControl.finished.catch(() => undefined),
          settleRotationControl.finished.catch(() => undefined),
        ])
      }

      void runFailureShake()
    }

    if (tag === "Died") {
      const schedule = (callback: () => void, delayMs: number) => {
        clearDeathGlitchTimer()
        deathGlitchTimer = setTimeout(() => {
          deathGlitchTimer = undefined
          if (!isActive()) return
          callback()
        }, delayMs)
      }

      const wait = (delayMs: number): Promise<void> =>
        new Promise((resolve) => {
          schedule(resolve, delayMs)
        })

      const runDeathGlitch = async (): Promise<void> => {
        for (let pulse = 0; pulse < GLITCH_INITIAL_COUNT; pulse += 1) {
          if (!isActive()) return

          motion.contentScale.set(1 + Math.random() * GLITCH_SCALE_RANGE)
          motion.glowIntensity.set(Math.random() * GLITCH_INTENSE_PULSE_MAX)

          await wait(
            randomBetween(
              GLITCH_INITIAL_DELAY_MIN_MS,
              GLITCH_INITIAL_DELAY_MAX_MS,
            ),
          )
          if (!isActive()) return

          motion.contentScale.set(1)
          motion.glowIntensity.set(GLITCH_GLOW_MAX)

          await wait(randomBetween(GLITCH_PAUSE_MIN_MS, GLITCH_PAUSE_MAX_MS))
        }

        const runSubtleLoop = () => {
          if (!isActive()) return

          motion.glowIntensity.set(
            randomBetween(GLITCH_GLOW_MIN, GLITCH_GLOW_MAX),
          )
          schedule(
            runSubtleLoop,
            randomBetween(
              GLITCH_SUBTLE_DELAY_MIN_MS,
              GLITCH_SUBTLE_DELAY_MAX_MS,
            ),
          )
        }

        runSubtleLoop()
      }

      void runDeathGlitch()
    }

    if (tag === "Interrupted") {
      registerControl(
        animate(motion.rotation, 0, {
          duration: TIMINGS.resetDurationSec,
          ease: "easeOut",
        }),
      )
      registerControl(
        animate(motion.shakeX, 0, {
          duration: TIMINGS.resetDurationSec,
          ease: "easeOut",
        }),
      )
      registerControl(
        animate(motion.shakeY, 0, {
          duration: TIMINGS.resetDurationSec,
          ease: "easeOut",
        }),
      )
    }

    return () => {
      runIdRef.current += 1
      stopRunningJitter()
      clearDeathGlitchTimer()
      stopAll()
      motion.glowIntensity.set(0)
      motion.contentScale.set(1)
      motion.rotation.set(0)
      motion.shakeX.set(0)
      motion.shakeY.set(0)
    }
  }, [
    motion,
    prefersReducedMotion,
    stopAll,
    tag,
    transition.justStarted,
    transition.justCompleted,
    transition.justDied,
    transition.justFailed,
  ])
}
