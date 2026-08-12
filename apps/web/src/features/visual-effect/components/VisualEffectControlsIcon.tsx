import { Play, RotateCcw, Square } from "lucide-react"
import {
  motion,
  useReducedMotion,
  AnimatePresence,
  type TargetAndTransition,
  type Transition,
} from "motion/react"
import type { VisualEffectState } from "@/features/visual-effect/model/domain"

const WIGGLE_KEYFRAMES = [0, -8, 8, -6, 6, -3, 3, 0]

export function VisualEffectControlsIcon({
  isAttracting = false,
  isHovered,
  isPressed,
  state,
}: {
  readonly isAttracting?: boolean
  readonly isHovered: boolean
  readonly isPressed: boolean
  readonly state: VisualEffectState
}) {
  const prefersReducedMotion = useReducedMotion() === true
  const icon = getIcon(state)
  const motionConfig = getMotionConfig(state, isHovered, prefersReducedMotion)
  const shouldWiggle = isAttracting && !prefersReducedMotion

  const getBackgroundColor = (state: VisualEffectState): string => {
    switch (state._tag) {
      case "Running":
        return "var(--color-blue-500)"
      case "Idle":
      case "Succeeded":
        return "var(--color-green-700)"
      case "Failed":
        return "var(--color-red-500)"
      case "Interrupted":
        return "var(--color-orange-500)"
      case "Died": {
        return "var(--color-red-800)"
      }
    }
  }

  const getPresenceKey = (state: VisualEffectState): string => {
    switch (state._tag) {
      case "Idle":
        return "play"
      case "Running":
        return "stop"
      case "Succeeded":
      case "Failed":
      case "Interrupted":
      case "Died":
        return "reset"
    }
  }

  return (
    <motion.span
      className="flex shrink-0"
      animate={{ rotate: shouldWiggle ? WIGGLE_KEYFRAMES : 0 }}
      transition={
        shouldWiggle
          ? {
              duration: 0.6,
              ease: "easeInOut",
              delay: 2,
              repeat: Infinity,
              repeatDelay: 4,
            }
          : { duration: 0.15, ease: "easeOut" }
      }
    >
      <motion.span
        className="flex size-10 items-center justify-center rounded-lg text-white"
        initial={false}
        animate={{
          background: getBackgroundColor(state),
          scale: isPressed ? 0.95 : isHovered ? 1.05 : 1,
        }}
        transition={{
          ...(prefersReducedMotion
            ? undefined
            : {
                scale: { type: "spring", stiffness: 300, damping: 20 },
                background: { duration: 0.2, ease: "easeInOut" },
              }),
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={getPresenceKey(state)}
            className="flex items-center"
            initial={motionConfig.initial}
            animate={motionConfig.animate}
            exit={motionConfig.exit}
            transition={motionConfig.transition}
          >
            {icon}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </motion.span>
  )
}

const getIcon = (state: VisualEffectState): React.ReactNode => {
  switch (state._tag) {
    case "Running": {
      return <Square className="size-5" fill="currentColor" />
    }
    case "Succeeded":
    case "Failed":
    case "Died":
    case "Interrupted": {
      return <RotateCcw className="-mr-px size-5 stroke-3" />
    }
    default: {
      return <Play className="-mr-px size-5 stroke-1" fill="currentColor" />
    }
  }
}

const getMotionConfig = (
  state: VisualEffectState,
  isHovered: boolean,
  prefersReducedMotion: boolean,
): {
  readonly initial: TargetAndTransition
  readonly animate: TargetAndTransition
  readonly exit: TargetAndTransition
  readonly transition: Transition
} => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0, scale: 1, rotate: 0, filter: "blur(0px)" },
      animate: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 1, rotate: 0, filter: "blur(0px)" },
      transition: { duration: 0.08, ease: "easeOut" },
    }
  }

  switch (state._tag) {
    case "Idle": {
      return isHovered
        ? {
            initial: { opacity: 0, rotate: 0, scale: 1 },
            animate: { opacity: 1, rotate: 360, scale: 1.05 },
            exit: { opacity: 0, rotate: -360, scale: 1 },
            transition: { duration: 0.12, ease: "easeOut" },
          }
        : {
            initial: { opacity: 0, scale: 0.8, filter: "blur(4px)" },
            animate: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
            exit: { opacity: 0, scale: 0.8, rotate: 20, filter: "blur(4px)" },
            transition: { duration: 0.14, ease: "easeOut" },
          }
    }
    case "Running": {
      return {
        initial: { opacity: 0, scale: 0, rotate: -180, filter: "blur(10px)" },
        animate: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0, rotate: 180, filter: "blur(10px)" },
        transition: { duration: 0.14, ease: "easeOut" },
      }
    }
    case "Succeeded":
    case "Failed":
    case "Died":
    case "Interrupted": {
      return {
        initial: { opacity: 0, scale: 0, rotate: -180, filter: "blur(10px)" },
        animate: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0, rotate: 180, filter: "blur(10px)" },
        transition: { duration: 0.14, ease: "easeOut" },
      }
    }
  }
}
