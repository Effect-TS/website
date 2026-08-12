import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import { OctagonAlert, Skull, Sparkle } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useTransform,
  type AnimationScope,
  type Variants,
} from "motion/react"
import * as React from "react"
import type {
  VisualEffectNotification,
  VisualEffectState,
} from "@/features/visual-effect/model/domain"
import { type EffectMotionValues } from "@/features/visual-effect/hooks/animation/useEffectMotionValues"
import { COLORS, SHADOW_COLORS, SPRINGS, VFX } from "@/lib/animation"
import { cn } from "@/lib/utils"
import { VisualEffectNotificationBubble } from "./VisualEffectNotificationBubble"

const FILTER_TRANSITION = { duration: 0.16, ease: "easeOut" } as const

export function VisualEffectNode({
  label,
  motionValues,
  onPointerEnter,
  onPointerLeave,
  scope,
  state,
}: {
  readonly label: string
  readonly motionValues: EffectMotionValues
  readonly onPointerEnter?: React.PointerEventHandler<HTMLDivElement>
  readonly onPointerLeave?: React.PointerEventHandler<HTMLDivElement>
  readonly scope: AnimationScope
  readonly state: VisualEffectState
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const notificationPresentation = useVisibleNotification(state, isHovered)

  const handlePointerEnter = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      setIsHovered(true)
      onPointerEnter?.(event)
    },
    [onPointerEnter],
  )

  const handlePointerLeave = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      setIsHovered(false)
      onPointerLeave?.(event)
    },
    [onPointerLeave],
  )

  return (
    <div>
      <motion.div
        className="relative flex h-14 items-center justify-center"
        style={{ width: motionValues.nodeWidth }}
      >
        <VisualEffectContainer
          notification={notificationPresentation?.notification}
          scope={scope}
          motionValues={motionValues}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          state={state}
          variant={notificationPresentation?.variant}
        >
          <VisualEffectOverlay motionValues={motionValues} state={state} />
          <VisualEffectContent motionValues={motionValues} state={state} />
        </VisualEffectContainer>
      </motion.div>
      <VisualEffectLabel label={label} />
    </div>
  )
}

type NotificationPresentation = {
  readonly notification: VisualEffectNotification
  readonly variant: "info" | "failure" | "death"
}

function useVisibleNotification(
  state: VisualEffectState,
  isHovered: boolean,
): NotificationPresentation | undefined {
  const semanticNotification = getNotificationPresentation(state)
  const notificationId = semanticNotification?.notification.id

  const [visibleNotification, setVisibleNotification] = React.useState<
    NotificationPresentation | undefined
  >(semanticNotification)

  React.useEffect(() => {
    if (semanticNotification === undefined) {
      setVisibleNotification(undefined)
      return
    }

    setVisibleNotification(semanticNotification)

    const notificationDuration = Duration.toMillis(
      semanticNotification.notification.duration,
    )

    const timeout = window.setTimeout(() => {
      setVisibleNotification((current) =>
        current?.notification.id === semanticNotification.notification.id
          ? undefined
          : current,
      )
    }, notificationDuration)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [notificationId])

  if (
    visibleNotification === undefined &&
    semanticNotification?.notification.showOnHover === true &&
    isHovered
  ) {
    return semanticNotification
  }

  return visibleNotification
}

function getNotificationPresentation(
  state: VisualEffectState,
): NotificationPresentation | undefined {
  switch (state._tag) {
    case "Running":
      return Option.match(state.notification, {
        onNone: () => undefined,
        onSome: (notification) => ({ notification, variant: "info" }),
      })
    case "Failed":
      return Option.match(state.notification, {
        onNone: () => undefined,
        onSome: (notification) => ({ notification, variant: "failure" }),
      })
    case "Died":
      return Option.match(state.notification, {
        onNone: () => undefined,
        onSome: (notification) => ({ notification, variant: "death" }),
      })
    default:
      return undefined
  }
}

function VisualEffectContainer({
  children,
  notification,
  scope,
  motionValues,
  onPointerEnter,
  onPointerLeave,
  state,
  variant = "info",
}: React.PropsWithChildren<{
  readonly notification: VisualEffectNotification | undefined
  readonly scope: AnimationScope
  readonly motionValues: EffectMotionValues
  readonly onPointerEnter: React.PointerEventHandler<HTMLDivElement>
  readonly onPointerLeave: React.PointerEventHandler<HTMLDivElement>
  readonly state: VisualEffectState
  readonly variant?: "info" | "failure" | "death" | undefined
}>) {
  const isDied = state._tag === "Died"

  const filter = useTransform(motionValues.blurAmount, (blur) => {
    const cappedBlur = Math.max(0, Math.min(blur, 2))
    return isDied
      ? `blur(${cappedBlur}px) contrast(${VFX.contrast.death}) brightness(${VFX.brightness.death})`
      : `blur(${cappedBlur}px)`
  })

  const boxShadow = useTransform(motionValues.glowIntensity, (glow) => {
    const baseGlow =
      state._tag === "Running"
        ? SHADOW_COLORS.task.running
        : SHADOW_COLORS.small
    const cappedGlow = Math.min(glow, 8)
    if (isDied) {
      return cappedGlow > 0
        ? `${baseGlow}, 0 0 ${cappedGlow * 2}px ${COLORS.glow.death}`
        : baseGlow
    }
    return cappedGlow > 0
      ? `${baseGlow}, 0 0 ${cappedGlow}px ${COLORS.glow.running}`
      : baseGlow
  })

  return (
    <VisualEffectNotificationBubble
      notification={notification}
      variant={variant}
    >
      <motion.div
        ref={scope}
        variants={VISUAL_EFFECT_NODE_VARIANTS}
        animate={state._tag}
        initial={false}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        style={{
          width: motionValues.nodeWidth,
          height: motionValues.nodeHeight,
          borderRadius: motionValues.borderRadius,
          rotate: motionValues.rotation,
          x: motionValues.shakeX,
          y: motionValues.shakeY,
          filter,
          boxShadow,
          border: isDied
            ? `2px solid ${COLORS.border.death}`
            : `1px solid ${COLORS.border.default}`,
          contain: "layout style paint",
          willChange: "transform, filter",
          transform: "translateZ(0)",
        }}
        className={cn("relative cursor-auto overflow-hidden")}
      >
        {children}
      </motion.div>
    </VisualEffectNotificationBubble>
  )
}

export const VISUAL_EFFECT_NODE_VARIANTS: Record<
  VisualEffectState["_tag"],
  Variants[string]
> = {
  Idle: {
    scale: 1,
    opacity: 0.6,
    backgroundColor: "var(--color-black)",
    transition: {
      backgroundColor: { duration: 0.1, ease: "easeInOut" },
      scale: SPRINGS.default,
      opacity: SPRINGS.default,
    },
  },
  Running: {
    scale: 0.95,
    opacity: 1,
    backgroundColor: "var(--color-blue-500)",
    transition: {
      backgroundColor: { duration: 0.1, ease: "easeInOut" },
      scale: SPRINGS.default,
      opacity: SPRINGS.default,
    },
  },
  Succeeded: {
    scale: 1,
    opacity: 1,
    backgroundColor: "var(--color-green-700)",
    transition: {
      backgroundColor: { duration: 0.1, ease: "easeInOut" },
      scale: SPRINGS.contentScale,
      opacity: SPRINGS.contentScale,
    },
  },
  Failed: {
    backgroundColor: "var(--color-red-500)",
    scale: 1,
    opacity: 1,
    transition: {
      backgroundColor: { duration: 0.1, ease: "easeInOut" },
      scale: SPRINGS.contentScale,
      opacity: SPRINGS.contentScale,
    },
  },
  Died: {
    backgroundColor: "var(--color-red-900)",
    scale: 1,
    opacity: 1,
    transition: {
      backgroundColor: { duration: 0.1, ease: "easeInOut" },
      scale: SPRINGS.contentScale,
      opacity: SPRINGS.contentScale,
    },
  },
  Interrupted: {
    backgroundColor: "var(--color-orange-500)",
    opacity: 1,
    scale: 1,
    transition: {
      backgroundColor: { duration: 0.1, ease: "easeInOut" },
      scale: SPRINGS.default,
      opacity: SPRINGS.default,
    },
  },
}

function VisualEffectOverlay({
  motionValues,
  state,
}: {
  readonly motionValues: EffectMotionValues
  readonly state: VisualEffectState
}) {
  const isRunning = state._tag === "Running"

  return (
    <>
      {isRunning && (
        <motion.div
          className={cn(
            "pointer-events-none absolute inset-0",
            "ring-1 ring-[rgba(100,200,255,0.8)] ring-inset",
          )}
          style={{
            borderRadius: motionValues.borderRadius,
            opacity: motionValues.borderOpacity,
          }}
        />
      )}

      {isRunning &&
        [0, 0.2, 0.4, 0.6, 0.8, 1].map((delay) => (
          <motion.div
            key={`delay(${delay.toString()})`}
            className={cn(
              "absolute top-0 bottom-0 left-0 w-[200%] mix-blend-lighten blur-xs",
              "bg-[linear-gradient(90deg,transparent_0%,transparent_40%,rgba(255,255,255,0.1)_45%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0.1)_55%,transparent_60%,transparent_100%)]",
            )}
            animate={{
              x: ["-66.0%", "50%"],
            }}
            transition={{
              duration: 0.8,
              delay,
              repeat: Infinity,
              ease: [0.5, 0, 0.1, 1],
            }}
          />
        ))}

      <motion.div
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          background: motionValues.flashColor,
          opacity: motionValues.flashOpacity,
        }}
      />
    </>
  )
}

function VisualEffectContent({
  motionValues,
  state,
}: {
  readonly motionValues: EffectMotionValues
  readonly state: VisualEffectState
}) {
  const contentRef = React.useRef<HTMLSpanElement>(null)

  const getContent = (state: VisualEffectState): React.ReactNode => {
    switch (state._tag) {
      case "Idle":
        return (
          <motion.div
            key="star"
            className="flex items-center justify-center"
            initial={{ scale: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, filter: "blur(0px)" }}
            exit={{ scale: 0, filter: "blur(10px)" }}
            transition={{
              scale: { type: "spring", bounce: 0.3, visualDuration: 0.3 },
              filter: FILTER_TRANSITION,
            }}
          >
            <VisualEffectNodeIcon size={56} state={state} />
          </motion.div>
        )
      case "Running":
        return null
      case "Succeeded": {
        return (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.5, filter: "blur(10px)" }}
            transition={{
              opacity: { duration: 0.16, ease: "easeOut" },
              scale: {
                ...SPRINGS.bouncy,
                stiffness: 260,
                damping: 18,
              },
              filter: FILTER_TRANSITION,
            }}
          >
            {state.value.render()}
          </motion.div>
        )
      }
      case "Failed":
      case "Interrupted":
      case "Died":
        return (
          <motion.div
            key={state._tag}
            className="flex items-center justify-center"
            initial={{ scale: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, filter: "blur(0px)" }}
            exit={{ scale: 0, filter: "blur(10px)" }}
            transition={{
              scale: {
                type: "spring",
                bounce: state._tag === "Interrupted" ? 0.5 : 0.3,
                visualDuration: 0.3,
              },
              filter: FILTER_TRANSITION,
            }}
          >
            <VisualEffectNodeIcon size={56} state={state} />
          </motion.div>
        )
    }
  }

  React.useLayoutEffect(() => {
    if (state._tag !== "Succeeded") return

    const content = contentRef.current
    if (!content) return

    const actualWidth = content.scrollWidth
    if (actualWidth > 40) {
      motionValues.nodeWidth.set(actualWidth + 24)
    }
  }, [motionValues.nodeWidth, state])

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center py-2 font-mono font-bold"
      style={{
        color: "white",
        opacity: motionValues.contentOpacity,
        scale: motionValues.contentScale,
      }}
    >
      <span ref={contentRef} className="whitespace-nowrap">
        <AnimatePresence mode="popLayout">{getContent(state)}</AnimatePresence>
      </span>
    </motion.div>
  )
}

function VisualEffectNodeIcon({
  size,
  state,
}: {
  readonly size: number
  readonly state: VisualEffectState
}) {
  const iconSize = size * 0.5
  switch (state._tag) {
    case "Failed":
      return <Skull className="fill-white text-red-500" size={iconSize * 1.2} />
    case "Died":
      return (
        <Skull className="fill-red-600 text-red-900" size={iconSize * 1.2} />
      )
    case "Interrupted":
      return <OctagonAlert size={iconSize} />
    default:
      return (
        <Sparkle
          className="text-neutral-200"
          size={iconSize}
          fill="currentColor"
        />
      )
  }
}

function VisualEffectLabel({ label }: { readonly label: string }) {
  return (
    <motion.div className="mt-2 text-center font-mono text-xs font-medium text-muted-foreground">
      <span>{label}</span>
    </motion.div>
  )
}
