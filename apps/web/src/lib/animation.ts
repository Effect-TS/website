import type { SpringOptions } from "motion/react"

export const COLORS = {
  border: {
    default: "#a1a1aa", // zinc-400
    death: "rgba(220, 38, 38, 0.4)",
  },

  flash: "rgba(255, 255, 255, 0.8)",

  glow: {
    death: "rgba(220, 38, 38, 0.8)", // red-600
    running: "rgba(59, 130, 246, 0.2)", // blue-500
  },
} as const

export const SHADOW_COLORS = {
  small: "0 2px 4px rgba(0,0,0,0.4)",

  task: {
    running: "0 0 24px rgba(59, 130, 246, 0.2)",
  },
} as const

export const SPRINGS = {
  default: {
    damping: 25,
    mass: 0.8,
    stiffness: 180,
  },
  bouncy: {
    bounce: 0.3,
    visualDuration: 0.5,
  },
  contentScale: {
    bounce: 0.3,
    damping: 18,
    stiffness: 260,
    visualDuration: 0.5,
  },
  nodeWidth: {
    bounce: 0.3,
    damping: 25,
    mass: 0.8,
    stiffness: 180,
    visualDuration: 0.6,
  },
} as const satisfies Record<string, SpringOptions>

export const TIMINGS = {
  runningBorderPulseDurationSec: 1.5,
  runningGlowPulseDurationSec: 0.5,
  runningJitterDurationSec: 0.4,
  failureShakeDurationSec: 0.36,
  flashInDurationSec: 0.02,
  flashOutDurationSec: 0.8,
  resetDurationSec: 0.2,
} as const

export const VFX = {
  brightness: {
    death: 0.8,
  },
  contrast: {
    death: 1.2,
  },
} as const
