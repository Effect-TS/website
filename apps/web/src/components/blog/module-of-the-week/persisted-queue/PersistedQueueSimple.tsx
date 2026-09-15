import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

export function SimpleDiagram({
  clock,
  time,
  reducedMotion,
}: {
  clock: MotionValue<number>
  time: number
  reducedMotion: boolean
}) {
  const id = useId()
  const stored = time >= 2
  const processing = time >= 5.2 && time < 8
  const complete = time >= 9
  const width = useTransform(
    clock,
    (t) => 136 * Math.max(0, Math.min(1, (t - 5.2) / 2.8)),
  )
  return (
    <svg
      className="pq-simple"
      viewBox="0 0 960 280"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>
        An upload API queues a thumbnail job for a worker
      </title>
      <desc id={`${id}-desc`}>
        The API offers image 041. The job waits in the persisted queue until a
        worker takes it, creates a thumbnail, and acknowledges completion. The
        stored job remains until processing is acknowledged.
      </desc>
      <path d="M216 140 C287 140 287 140 358 140" className="pq-wire" />
      <path d="M602 140 C673 140 673 140 744 140" className="pq-wire" />
      <text x="48" y="58" className="pq-label">
        PRODUCER
      </text>
      <text x="358" y="58" className="pq-label">
        PERSISTED QUEUE
      </text>
      <text x="744" y="58" className="pq-label">
        CONSUMER
      </text>
      <g transform="translate(48 104)">
        <rect width="168" height="72" rx="4" className="pq-node" />
        <text x="16" y="27" className="pq-node-title">
          UPLOAD API
        </text>
        <text x="16" y="51" className="pq-small">
          {stored ? "request done" : "offer(image)"}
        </text>
      </g>
      <rect
        x="358"
        y="88"
        width="244"
        height="104"
        rx="5"
        className="pq-store"
      />
      <text x="376" y="115" className="pq-node-title">
        thumbnails
      </text>
      <path d="M358 129 H602" className="pq-divider" />
      {stored && (
        <g>
          <circle
            cx="380"
            cy="158"
            r="3"
            className={complete ? "pq-green" : "pq-orange"}
          />
          <text x="392" y="162" className="pq-small">
            #041
          </text>
          <text x="584" y="162" textAnchor="end" className="pq-small">
            {complete ? "complete" : time >= 4 ? "processing" : "waiting"}
          </text>
        </g>
      )}
      <g transform="translate(744 104)">
        <rect
          width="168"
          height="72"
          rx="4"
          className={`pq-node ${processing ? "pq-node-active" : ""}`}
        />
        <text x="16" y="27" className="pq-node-title">
          WORKER
        </text>
        <text x="16" y="51" className="pq-small">
          {time >= 8 ? "✓ ready" : processing ? "resize #041" : "take(handler)"}
        </text>
        {processing && !reducedMotion && (
          <motion.rect
            x="16"
            y="62"
            height="2"
            width={width}
            className="pq-orange"
          />
        )}
      </g>
      {!reducedMotion && (
        <>
          <Packet
            clock={clock}
            start={0.6}
            duration={1.4}
            fromX={216}
            fromY={140}
            toX={358}
            toY={140}
            label="#041"
          />
          <Packet
            clock={clock}
            start={4}
            duration={1.2}
            fromX={602}
            fromY={140}
            toX={744}
            toY={140}
            label="#041"
          />
          <Packet
            clock={clock}
            start={8}
            duration={1}
            fromX={744}
            fromY={140}
            toX={602}
            toY={140}
            label="ACK"
            ack
          />
        </>
      )}
      <text x="480" y="238" textAnchor="middle" className="pq-small">
        {time < 2
          ? "The API offers a thumbnail job."
          : time < 4
            ? "The request is finished. The job can wait."
            : time < 8
              ? "The worker picks up the job and creates the thumbnail."
              : "The worker finishes and acknowledges the job."}
      </text>
    </svg>
  )
}
