import type { ComponentProps } from "react"
import { AnimationPacket } from "../animation/AnimationPacket"

export function PersistedQueuePacket({
  ack = false,
  ...props
}: Omit<ComponentProps<typeof AnimationPacket>, "className"> & {
  ack?: boolean
}) {
  return (
    <AnimationPacket
      {...props}
      className={`pq-packet ${ack ? "pq-ack" : ""}`}
    />
  )
}
