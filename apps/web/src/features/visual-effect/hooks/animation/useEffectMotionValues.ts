import {
  type MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react"
import { useMemo } from "react"
import { COLORS, SPRINGS } from "@/lib/animation"

export interface EffectMotionValues {
  readonly nodeWidth: MotionValue<number>
  readonly nodeHeight: MotionValue<number>
  readonly contentOpacity: MotionValue<number>
  readonly flashOpacity: MotionValue<number>
  readonly flashColor: MotionValue<string>
  readonly borderRadius: MotionValue<number>
  readonly rotation: MotionValue<number>
  readonly shakeX: MotionValue<number>
  readonly shakeY: MotionValue<number>
  readonly contentScale: MotionValue<number>
  readonly blurAmount: MotionValue<number>
  readonly borderOpacity: MotionValue<number>
  readonly glowIntensity: MotionValue<number>
}

export const useEffectMotionValues = (): EffectMotionValues => {
  const nodeWidth = useSpring(56, SPRINGS.nodeWidth)
  const nodeHeight = useSpring(56, SPRINGS.default)

  const contentOpacity = useSpring(1, SPRINGS.default)
  const contentScale = useSpring(1, SPRINGS.default)

  const flashOpacity = useMotionValue(0)
  const flashColor = useMotionValue<string>(COLORS.flash)

  const borderOpacity = useSpring(1, SPRINGS.default)
  const borderRadius = useSpring(8, SPRINGS.default)

  const glowIntensity = useSpring(0, SPRINGS.default)

  const rotation = useMotionValue(0)
  const rotationVelocity = useVelocity(rotation)

  const shakeX = useMotionValue(0)
  const shakeY = useMotionValue(0)

  const blurAmount = useTransform(rotationVelocity, [-100, 0, 100], [1, 0, 1], {
    clamp: true,
  })

  return useMemo(
    () => ({
      nodeWidth,
      nodeHeight,
      contentOpacity,
      contentScale,
      flashOpacity,
      flashColor,
      borderOpacity,
      borderRadius,
      glowIntensity,
      rotation,
      shakeX,
      shakeY,
      blurAmount,
    }),
    [],
  )
}
