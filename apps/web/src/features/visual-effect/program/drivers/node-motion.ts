import { Array, Schema } from "effect"
import {
  motionValue,
  springValue,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion"
import { SPRINGS } from "@/lib/animation"

/** What the parts of a node share: its names, sizes, ranges and spring values. */

export const NODE_TAGS = [
  "Idle",
  "Running",
  "Succeeded",
  "Failed",
  "Died",
  "Interrupted",
] as const

export const NodeTagSchema = Schema.Literals(NODE_TAGS)

export type NodeTag = typeof NodeTagSchema.Type

export const NODE_PARTS = {
  outer: "outer",
  container: "container",
  content: "content",
  ring: "ring",
  flash: "flash",
  shimmer: "shimmer",
} as const

export const BASE_NODE_SIZE = 56
export const RUNNING_NODE_HEIGHT = BASE_NODE_SIZE * 0.4
export const BASE_BORDER_RADIUS = 8
export const RUNNING_BORDER_RADIUS = 15
export const SUCCESS_WIDTH_PADDING = 24
export const MIN_MEASURED_WIDTH = 40

export const RUNNING_ANGLE_RANGE = 4
export const RUNNING_ANGLE_BASE = 0.5
export const RUNNING_OFFSET_X_RANGE = 1.5
export const RUNNING_OFFSET_X_BASE = 0.5
export const RUNNING_OFFSET_Y_RANGE = 0.6
export const RUNNING_OFFSET_Y_BASE = 0.1
export const RUNNING_DURATION_MIN_SEC = 0.1
export const RUNNING_DURATION_MAX_SEC = 0.2

export const FAILURE_SHAKE_INTENSITY = 8
export const FAILURE_SHAKE_STEP_DURATION_SEC = 0.08
export const FAILURE_SHAKE_COUNT = 6
export const FAILURE_SHAKE_ROTATION_RANGE = 8
export const FAILURE_SHAKE_RETURN_DURATION_SEC = 0.3

export const GLITCH_INITIAL_COUNT = 3
export const GLITCH_INITIAL_DELAY_MIN_MS = 20
export const GLITCH_INITIAL_DELAY_MAX_MS = 70
export const GLITCH_PAUSE_MIN_MS = 50
export const GLITCH_PAUSE_MAX_MS = 150
export const GLITCH_SUBTLE_DELAY_MIN_MS = 300
export const GLITCH_SUBTLE_DELAY_MAX_MS = 800
export const GLITCH_SCALE_RANGE = 0.2
export const GLITCH_GLOW_MIN = 3
export const GLITCH_GLOW_MAX = 7
export const GLITCH_INTENSE_PULSE_MAX = 10

export const SHIMMER_DELAYS = [0, 0.2, 0.4, 0.6, 0.8, 1] as const

export const randomBetween = (minimum: number, maximum: number): number =>
  minimum + Math.random() * Math.max(0, maximum - minimum)

export const randomSign = (): 1 | -1 => (Math.random() < 0.5 ? 1 : -1)

export const part = (root: Element, name: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[data-node="${name}"]`)

export const parts = (
  root: Element,
  name: string,
): ReadonlyArray<HTMLElement> =>
  Array.fromIterable(
    root.querySelectorAll<HTMLElement>(`[data-node="${name}"]`),
  )

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export interface Motion {
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

export const makeMotion = (): Motion => ({
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

export const stopAll = (
  controls: ReadonlyArray<AnimationPlaybackControls>,
): void => Array.forEach(controls, (control) => control.stop())
