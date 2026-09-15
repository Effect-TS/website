import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

interface SimpleDiagramProps {
  clock: MotionValue<number>
  time: number
  reducedMotion: boolean
}

export function SimpleDiagram(props: SimpleDiagramProps) {
  return (
    <>
      <SimpleLayout {...props} mobile={false} />
      <SimpleLayout {...props} mobile />
    </>
  )
}

function SimpleLayout({
  clock,
  time,
  reducedMotion,
  mobile,
}: SimpleDiagramProps & { mobile: boolean }) {
  const id = useId()
  const stored = time >= 2
  const processing = time >= 5.2 && time < 8
  const complete = time >= 9
  const progress = Math.max(0, Math.min(1, (time - 5.2) / 2.8))
  const wordCount = Math.round(900 - 897 * progress)
  const width = useTransform(
    clock,
    (t) => 136 * Math.max(0, Math.min(1, (t - 5.2) / 2.8)),
  )
  return (
    <svg
      className={`pq-simple ${mobile ? "pq-simple-mobile" : "pq-simple-desktop"}`}
      viewBox={mobile ? "0 0 360 902" : "0 0 960 410"}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>
        A post API queues a de-slop job for a worker
      </title>
      <desc id={`${id}-desc`}>
        The API offers post 041. A worker removes filler from the post, reducing
        900 words to “I got promoted.” The stored job remains until the worker
        acknowledges completion.
      </desc>
      <path
        d={
          mobile
            ? "M264 76 C340 76 340 240 302 240"
            : "M216 140 C287 140 287 140 358 140"
        }
        className="pq-wire"
      />
      <path
        d={
          mobile
            ? "M58 240 C20 240 20 408 96 408"
            : "M602 140 C673 140 673 140 744 140"
        }
        className="pq-wire"
      />
      <text x={mobile ? 96 : 48} y={mobile ? 24 : 58} className="pq-label">
        PRODUCER
      </text>
      <text x={mobile ? 58 : 358} y={mobile ? 172 : 58} className="pq-label">
        PERSISTED QUEUE
      </text>
      <text x={mobile ? 96 : 744} y={mobile ? 356 : 58} className="pq-label">
        CONSUMER
      </text>
      <g transform={mobile ? "translate(96 40)" : "translate(48 104)"}>
        <rect width="168" height="72" rx="4" className="pq-node" />
        <text x="16" y="27" className="pq-node-title">
          POST API
        </text>
        <text x="16" y="51" className="pq-small">
          {stored ? "request done" : "offer(post)"}
        </text>
      </g>
      <g transform={mobile ? "translate(-300 100)" : undefined}>
        <rect
          x="358"
          y="88"
          width="244"
          height="104"
          rx="5"
          className="pq-store"
        />
        <text x="376" y="115" className="pq-node-title">
          posts
        </text>
        <path d="M358 129 H602" className="pq-divider" />
        {stored && (
          <g
            className={`pq-job ${complete ? "pq-job-complete" : time >= 4 ? "pq-job-processing" : ""}`}
          >
            <rect
              x="368"
              y="140"
              width="224"
              height="36"
              rx="4"
              className="pq-node"
            />
            <circle
              cx="380"
              cy="158"
              r="3"
              className={complete ? "pq-green" : "pq-orange"}
            />
            <text x="392" y="162" className="pq-small">
              #041
            </text>
            <text
              x="584"
              y="162"
              textAnchor="end"
              className={`pq-small ${complete ? "pq-success-text" : ""}`}
            >
              {complete ? "complete" : time >= 4 ? "processing" : "waiting"}
            </text>
          </g>
        )}
      </g>
      <g transform={mobile ? "translate(96 372)" : "translate(744 104)"}>
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
          {time >= 8
            ? "✓ ready"
            : processing
              ? "de-slop #041"
              : "take(handler)"}
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
            controlX={mobile ? 340 : undefined}
            fromX={mobile ? 264 : 216}
            fromY={mobile ? 76 : 140}
            toX={mobile ? 302 : 358}
            toY={mobile ? 240 : 140}
            label="#041"
          />
          <Packet
            clock={clock}
            start={4}
            duration={1.2}
            controlX={mobile ? 20 : undefined}
            fromX={mobile ? 58 : 602}
            fromY={mobile ? 240 : 140}
            toX={mobile ? 96 : 744}
            toY={mobile ? 408 : 140}
            label="#041"
          />
          <Packet
            clock={clock}
            start={8}
            duration={1}
            controlX={mobile ? 20 : undefined}
            fromX={mobile ? 96 : 744}
            fromY={mobile ? 408 : 140}
            toX={mobile ? 58 : 602}
            toY={mobile ? 240 : 140}
            label="ACK"
            ack
          />
        </>
      )}
      <rect
        x={mobile ? 24 : 48}
        y={mobile ? 488 : 220}
        width={mobile ? 312 : 864}
        height={mobile ? 390 : 166}
        rx="5"
        className="pq-node"
      />
      <path
        d={mobile ? "M24 844 H336" : "M48 352 H912"}
        className="pq-divider"
      />
      <text x={mobile ? 40 : 68} y={mobile ? 866 : 374} className="pq-small">
        Total words: {stored ? wordCount : "—"}
      </text>
      <foreignObject
        x={mobile ? 40 : 68}
        y={mobile ? 504 : 236}
        width={mobile ? 280 : 824}
        height={mobile ? 340 : 116}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 400,
            lineHeight: "24px",
            color: "var(--pq-ink)",
          }}
        >
          {!stored ? null : time < 8 ? (
            <>
              <span
                style={{
                  textDecoration: progress > 0.15 ? "line-through" : "none",
                }}
              >
                I'm humbled and beyond thrilled to announce the next chapter in
                my leadership journey.
              </span>{" "}
              <span
                style={{
                  textDecoration: progress > 0.35 ? "line-through" : "none",
                }}
              >
                After countless moments of growth and leaning into discomfort,
              </span>{" "}
              I got promoted.{" "}
              <span
                style={{
                  textDecoration: progress > 0.55 ? "line-through" : "none",
                }}
              >
                This isn't about a title. It's about showing up as my authentic
                self.
              </span>{" "}
              <span
                style={{
                  textDecoration: progress > 0.75 ? "line-through" : "none",
                }}
              >
                Let that sink in. What does leadership mean to YOU?
              </span>
            </>
          ) : (
            "I got promoted."
          )}
        </div>
      </foreignObject>
    </svg>
  )
}
