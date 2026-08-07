import {
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react"
import { useMemo } from "react"
import { COLORS, SPRINGS } from "@/lib/animation"

export interface EffectMotionValues {
  nodeWidth: MotionValue<number>
  nodeHeight: MotionValue<number>
  contentOpacity: MotionValue<number>
  flashOpacity: MotionValue<number>
  flashColor: MotionValue<string>
  borderRadius: MotionValue<number>
  rotation: MotionValue<number>
  shakeX: MotionValue<number>
  shakeY: MotionValue<number>
  contentScale: MotionValue<number>
  blurAmount: MotionValue<number>
  borderColor: MotionValue<string>
  borderOpacity: MotionValue<number>
  glowIntensity: MotionValue<number>
}

export const useEffectMotion = (): EffectMotionValues => {
  const nodeWidth = useSpring(56, SPRINGS.nodeWidth)
  const nodeHeight = useMotionValue(56)

  const contentOpacity = useSpring(1, SPRINGS.default)
  const contentScale = useSpring(1, SPRINGS.default)

  const flashOpacity = useMotionValue(0)
  const flashColor = useMotionValue<string>(COLORS.flash)

  const borderColor = useMotionValue<string>(COLORS.border.default)
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

  const motionValues = useMemo(
    () => ({
      nodeWidth,
      nodeHeight,
      contentOpacity,
      contentScale,
      flashOpacity,
      flashColor,
      borderColor,
      borderOpacity,
      borderRadius,
      glowIntensity,
      rotation,
      rotationVelocity,
      shakeX,
      shakeY,
      blurAmount,
    }),
    [],
  )

  return motionValues
}
