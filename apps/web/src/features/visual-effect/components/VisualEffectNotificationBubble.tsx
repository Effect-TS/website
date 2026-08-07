import { cva } from "class-variance-authority"
import { constVoid } from "effect/Function"
import {
  animate,
  AnimatePresence,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import * as React from "react"
import type { VisualEffectNotification } from "@/features/visual-effect/model/domain"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const DEATH_GLITCH_CHARSET = "@#$%&*/=-+?!~<>\\|"
const DEATH_GLITCH_MIN_LENGTH = 6
const DEATH_GLITCH_MAX_LENGTH = 16
const DEATH_SHAKE_STEP_COUNT = 6
const DEATH_SHAKE_STEP_DURATION_SEC = 0.05
const DEATH_SHAKE_RETURN_DURATION_SEC = 0.12
const DEATH_SHAKE_X_RANGE_PX = 10
const DEATH_SHAKE_Y_RANGE_PX = 8
const DEATH_SHAKE_ROTATION_RANGE_DEG = 5
const DEATH_SHAKE_BASE_Y_PX = -2
const DEATH_SHAKE_START_DELAY_MS = 120
const FAILURE_SHAKE_STEP_COUNT = 6
const FAILURE_SHAKE_STEP_DURATION_SEC = 0.05
const FAILURE_SHAKE_RETURN_DURATION_SEC = 0.12
const FAILURE_SHAKE_X_RANGE_PX = 10
const FAILURE_SHAKE_Y_RANGE_PX = 8
const FAILURE_SHAKE_ROTATION_RANGE_DEG = 5
const FAILURE_SHAKE_BASE_Y_PX = -2
const FAILURE_SHAKE_START_DELAY_MS = 120

const bubbleVariants = cva(
  cn(
    "max-w-[220px] rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
    "pointer-events-none",
  ),
  {
    variants: {
      variant: {
        info: "bg-sky-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35),0_4px_16px_rgba(14,165,233,0.35)]",
        failure:
          "bg-red-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35),0_4px_16px_rgba(239,68,68,0.35)]",
        death:
          "bg-black/95 text-red-500 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.55),0_10px_30px_rgba(0,0,0,0.45),0_4px_16px_rgba(220,38,38,0.18)]",
      },
    },
  },
)

const arrowVariants = cva("size-3 rounded-[2px] border-none", {
  variants: {
    variant: {
      info: "bg-sky-500 fill-sky-500",
      failure: "bg-red-500 fill-red-500",
      death: "bg-black/95 fill-black/95",
    },
  },
})

export function VisualEffectNotificationBubble({
  children,
  notification,
  variant = "info",
}: React.PropsWithChildren<{
  readonly notification: VisualEffectNotification | undefined
  readonly variant?: "info" | "failure" | "death"
}>) {
  if (!React.isValidElement(children)) {
    return children
  }

  return (
    <Tooltip open={notification !== undefined}>
      <TooltipTrigger render={children} />
      <AnimatePresence initial={false}>
        {notification && (
          <VisualEffectTooltipContent
            notification={notification}
            variant={variant}
          />
        )}
      </AnimatePresence>
    </Tooltip>
  )
}

interface AnimationControl {
  readonly stop: () => void
  readonly finished: Promise<void>
}

interface BubbleShakeConfig {
  readonly stepCount: number
  readonly stepDurationSec: number
  readonly returnDurationSec: number
  readonly xRangePx: number
  readonly yRangePx: number
  readonly rotationRangeDeg: number
  readonly baseYPx: number
  readonly startDelayMs: number
}

const bubbleShakeConfigByTone: Record<"failure" | "death", BubbleShakeConfig> =
  {
    failure: {
      stepCount: FAILURE_SHAKE_STEP_COUNT,
      stepDurationSec: FAILURE_SHAKE_STEP_DURATION_SEC,
      returnDurationSec: FAILURE_SHAKE_RETURN_DURATION_SEC,
      xRangePx: FAILURE_SHAKE_X_RANGE_PX,
      yRangePx: FAILURE_SHAKE_Y_RANGE_PX,
      rotationRangeDeg: FAILURE_SHAKE_ROTATION_RANGE_DEG,
      baseYPx: FAILURE_SHAKE_BASE_Y_PX,
      startDelayMs: FAILURE_SHAKE_START_DELAY_MS,
    },
    death: {
      stepCount: DEATH_SHAKE_STEP_COUNT,
      stepDurationSec: DEATH_SHAKE_STEP_DURATION_SEC,
      returnDurationSec: DEATH_SHAKE_RETURN_DURATION_SEC,
      xRangePx: DEATH_SHAKE_X_RANGE_PX,
      yRangePx: DEATH_SHAKE_Y_RANGE_PX,
      rotationRangeDeg: DEATH_SHAKE_ROTATION_RANGE_DEG,
      baseYPx: DEATH_SHAKE_BASE_Y_PX,
      startDelayMs: DEATH_SHAKE_START_DELAY_MS,
    },
  }

function VisualEffectTooltipContent({
  notification,
  variant,
}: {
  readonly notification: VisualEffectNotification
  readonly variant: "info" | "failure" | "death"
}) {
  const prefersReducedMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useMotionValue(0)
  const shakeConfig =
    variant === "info" ? undefined : bubbleShakeConfigByTone[variant]

  React.useEffect(() => {
    x.set(0)
    y.set(shakeConfig?.baseYPx ?? 0)
    rotate.set(0)

    if (shakeConfig === undefined || prefersReducedMotion) {
      return
    }

    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const controls: Array<AnimationControl> = []

    const stopAll = () => {
      for (const control of controls) {
        control.stop()
      }
      controls.length = 0
    }

    const register = (control: AnimationControl) => {
      controls.push(control)
      return control
    }

    const animateStep = async (
      motionValue: typeof x,
      value: number,
      duration: number,
      ease: "easeInOut" | "easeOut",
    ) =>
      register(animate(motionValue, value, { duration, ease })).finished.catch(
        constVoid,
      )

    const run = async () => {
      for (let step = 0; step < shakeConfig.stepCount; step += 1) {
        if (!active) return

        await Promise.all([
          animateStep(
            x,
            randomBetween(-shakeConfig.xRangePx / 2, shakeConfig.xRangePx / 2),
            shakeConfig.stepDurationSec,
            "easeInOut",
          ),
          animateStep(
            y,
            shakeConfig.baseYPx +
              randomBetween(
                -shakeConfig.yRangePx / 2,
                shakeConfig.yRangePx / 2,
              ),
            shakeConfig.stepDurationSec,
            "easeInOut",
          ),
          animateStep(
            rotate,
            randomBetween(
              -shakeConfig.rotationRangeDeg / 2,
              shakeConfig.rotationRangeDeg / 2,
            ),
            shakeConfig.stepDurationSec,
            "easeInOut",
          ),
        ])
      }

      if (!active) return

      await Promise.all([
        animateStep(x, 0, shakeConfig.returnDurationSec, "easeOut"),
        animateStep(
          y,
          shakeConfig.baseYPx,
          shakeConfig.returnDurationSec,
          "easeOut",
        ),
        animateStep(rotate, 0, shakeConfig.returnDurationSec, "easeOut"),
      ])
    }

    timeout = setTimeout(() => {
      if (!active) return
      void run()
    }, shakeConfig.startDelayMs)

    return () => {
      active = false
      if (timeout !== undefined) {
        clearTimeout(timeout)
      }
      stopAll()
      x.set(0)
      y.set(shakeConfig.baseYPx)
      rotate.set(0)
    }
  }, [notification.id, prefersReducedMotion, rotate, shakeConfig, x, y])

  return (
    <TooltipContent
      presence
      side="top"
      sideOffset={12}
      className={bubbleVariants({ variant })}
      arrowClassName={arrowVariants({ variant })}
      motionStyle={shakeConfig === undefined ? undefined : { x, y, rotate }}
    >
      {variant === "death" ? (
        <VisualEffectDeathBubbleContent notification={notification} />
      ) : (
        <span>{notification.message}</span>
      )}
    </TooltipContent>
  )
}

function VisualEffectDeathBubbleContent({
  notification,
}: {
  readonly notification: VisualEffectNotification
}) {
  const glitchText = React.useMemo(
    () => makeDeathGlitchText(notification.message),
    [notification.id, notification.message],
  )

  return (
    <span
      aria-label={notification.message}
      className="inline-block font-bold tracking-[0.08em] text-red-500 uppercase"
    >
      <span aria-hidden>{glitchText}</span>
    </span>
  )
}

function makeDeathGlitchText(message: string): string {
  const sourceLength = Array.from(message).length
  const length = clamp(
    sourceLength,
    DEATH_GLITCH_MIN_LENGTH,
    DEATH_GLITCH_MAX_LENGTH,
  )

  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * DEATH_GLITCH_CHARSET.length)
    return DEATH_GLITCH_CHARSET[index] ?? DEATH_GLITCH_CHARSET[0]
  }).join("")
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
