import { motion, useTransform, type MotionValue } from "motion/react"

// The packet follows the same cubic curve as its wire. Motion values keep
// movement independent of React's lower-frequency text updates.
export function PersistedQueuePacket({
  clock,
  start,
  duration,
  fromX,
  fromY,
  toX,
  toY,
  label,
  ack = false,
  controlX,
}: {
  clock: MotionValue<number>
  start: number
  duration: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  label: string
  ack?: boolean
  controlX?: number
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
      className={`pq-packet ${ack ? "pq-ack" : ""}`}
      style={{ x, y, opacity }}
      aria-hidden="true"
    >
      <rect x="-24" y="-12" width="48" height="24" rx="3" />
      <text y="4" textAnchor="middle">
        {label}
      </text>
    </motion.g>
  )
}
