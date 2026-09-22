import { motion, useTransform, type MotionValue } from "motion/react"
import "./AnimationPacket.css"

/** A labeled message following the cubic curve between two diagram nodes. */
export function AnimationPacket({
  clock,
  start,
  duration,
  fromX,
  fromY,
  toX,
  toY,
  label,
  controlX,
  width = 48,
  className = "",
}: {
  clock: MotionValue<number>
  start: number
  duration: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  label: string
  controlX?: number | undefined
  width?: number
  className?: string
}) {
  const progress = useTransform(clock, (time) =>
    Math.max(0, Math.min(1, (time - start) / duration)),
  )
  const x = useTransform(progress, (t) => {
    const middle = controlX ?? (fromX + toX) / 2
    return (1 - t) ** 3 * fromX + 3 * (1 - t) * t * middle + t ** 3 * toX
  })
  const y = useTransform(
    progress,
    (t) => fromY + (toY - fromY) * (3 * t * t - 2 * t ** 3),
  )
  const opacity = useTransform(clock, (time) => {
    const t = (time - start) / duration
    return Math.max(0, Math.min(1, t * 10, (1 - t) * 10))
  })
  return (
    <motion.g
      className={`animation-packet ${className}`}
      style={{ x, y, opacity }}
      aria-hidden="true"
    >
      <rect x={-width / 2} y="-12" width={width} height="24" rx="3" />
      <text y="4" textAnchor="middle">
        {label}
      </text>
    </motion.g>
  )
}
