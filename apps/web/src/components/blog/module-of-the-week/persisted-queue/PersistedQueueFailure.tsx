import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

export const failureDuration = 19

const otherPosts = [
  { id: "042", claim: 0, ack: 2.2 },
  { id: "043", claim: 3.5, ack: 5.8 },
]

const refreshes = [
  { at: 3, worker: 1 },
  { at: 5, worker: 1 },
  { at: 14, worker: 2 },
]

function lockRemaining(time: number) {
  const { locked, attempt } = failureFrame(time)
  if (!locked) return 0
  let refreshedAt = attempt === 1 ? 1 : 12
  for (const refresh of refreshes) {
    if (refresh.worker === attempt && refresh.at <= time)
      refreshedAt = refresh.at
  }
  return Math.max(0, refreshedAt + 4 - time)
}

// Claims at 1s and 12s. Failure releases the lock at 7s; retry delay ends at 12s.
export function failureFrame(time: number) {
  const stage =
    time < 1
      ? "ready"
      : time < 2.2
        ? "claim"
        : time < 6
          ? "process"
          : time < 7
            ? "fail"
            : time < 12
              ? "wait"
              : time < 13.2
                ? "reclaim"
                : time < 15
                  ? "retry"
                  : time < 16
                    ? "ack"
                    : "complete"
  const attempt = time < 1 ? 0 : time < 12 ? 1 : 2
  const locked = stage !== "ready" && stage !== "wait" && stage !== "complete"
  const phase = time < 6 ? 0 : time < 7 ? 1 : time < 16 ? 2 : 3
  const explanation =
    time < 6
      ? "Worker 1 claims post 041 and processes it on attempt 1."
      : time < 12
        ? "The handler fails. The lock is released, then a five-second retry delay applies."
        : time < 16
          ? "Worker 2 claims the same post for attempt 2 and processes it."
          : "Worker 2 acknowledges completion and releases the lock."
  return { stage, attempt, locked, phase, explanation }
}

export function FailureDiagram({
  clock,
  time,
  reducedMotion,
  mobile = false,
}: {
  clock: MotionValue<number>
  time: number
  reducedMotion: boolean
  mobile?: boolean
}) {
  const id = useId()
  const { stage, attempt, locked, explanation } = failureFrame(time)
  const complete = stage === "complete"
  const waiting = stage === "wait"
  const owner = locked ? attempt : 0
  const queueX = mobile ? 30 : 440
  const queueY = 232
  const workerX = mobile ? 110 : 680
  const workerY = (worker: number) =>
    mobile ? (worker === 1 ? 500 : 610) : worker === 1 ? 120 : 230
  const controlX = mobile ? 16 : 560
  const retryWidth = useTransform(
    clock,
    (t) => 288 * Math.max(0, Math.min(1, (12 - t) / 5)),
  )
  const lockWidth = useTransform(clock, (t) => (288 * lockRemaining(t)) / 4)
  return (
    <svg
      className={`pq-failure-demo ${mobile ? "pq-failure-mobile" : ""}`}
      viewBox={mobile ? "0 0 420 670" : "0 0 960 424"}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      data-stage={stage}
      data-attempt={attempt}
      data-locked={locked}
    >
      <title id={`${id}-title`}>
        A failed de-slop job gets a second attempt
      </title>
      <desc id={`${id}-desc`}>
        {explanation} Worker 2 processes posts 042 and 043 before retrying post
        041. The queue allows three attempts in total.
      </desc>
      <text x={mobile ? 30 : 80} y="40" className="pq-label">
        PERSISTED QUEUE
      </text>
      <text x={workerX} y={mobile ? 440 : 40} className="pq-label">
        CONSUMERS
      </text>
      {[1, 2].map((worker) => {
        const y = workerY(worker)
        const failed = worker === 1 && time >= 6
        const otherPost =
          worker === 2
            ? otherPosts.find(
                (post) => time >= post.claim && time < post.ack + 1,
              )
            : undefined
        const active = (owner === worker && !failed) || otherPost !== undefined
        const processing =
          worker === 1 ? stage === "process" : stage === "retry"
        return (
          <g key={worker}>
            <path
              d={`M${queueX} ${queueY} C${controlX} ${queueY} ${controlX} ${y} ${workerX} ${y}`}
              className={`pq-wire ${active ? "pq-wire-active" : ""}`}
            />
            <g transform={`translate(${workerX} ${y - 36})`}>
              <rect
                width="200"
                height="72"
                rx="4"
                strokeWidth={failed ? 2 : 1}
                className={`pq-node ${failed ? "pq-node-error" : active ? "pq-node-active" : ""}`}
              />
              <text x="16" y="27" className="pq-node-title">
                WORKER {worker}
              </text>
              <text
                x="16"
                y="51"
                className={
                  failed
                    ? "pq-error-text"
                    : complete && worker === 2
                      ? "pq-success-text"
                      : "pq-small"
                }
              >
                {failed
                  ? "× DeslopError"
                  : otherPost
                    ? time < otherPost.claim + 1.2
                      ? "take(handler)"
                      : `${time >= otherPost.ack ? "ack" : "deslop"} #${otherPost.id}`
                    : complete
                      ? "✓ ready"
                      : stage === "ack"
                        ? "ack #041"
                        : processing
                          ? "deslop #041"
                          : "take(handler)"}
              </text>
            </g>
          </g>
        )
      })}
      <g transform={mobile ? "translate(-50 0)" : undefined}>
        <rect
          x="80"
          y="64"
          width="360"
          height="336"
          rx="5"
          className="pq-store"
        />
        <text x="108" y="94" className="pq-node-title">
          posts
        </text>
        <path d="M80 110 H440" className="pq-divider" />
        <g
          className={`pq-job ${complete ? "pq-job-complete" : waiting ? "pq-job-error" : locked ? "pq-job-processing" : ""}`}
        >
          <rect x="96" y="124" width="328" height="160" rx="4" />
          <text x="112" y="150" className="pq-node-title">
            #041
          </text>
          <text x="408" y="150" textAnchor="end" className="pq-small">
            Attempt {attempt} / 3
          </text>
          <text
            x="112"
            y="182"
            className={complete ? "pq-job-status" : "pq-small"}
          >
            {complete
              ? "✓ done"
              : locked
                ? `Locked by worker ${owner}`
                : waiting
                  ? "Lock released"
                  : "pending"}
          </text>
          <text x="112" y="224" className="pq-small">
            {waiting
              ? `Retry in ${(12 - time).toFixed(1)}s`
              : locked
                ? `Expires in ${lockRemaining(time).toFixed(1)}s`
                : complete
                  ? "Acknowledged"
                  : ""}
          </text>
        </g>
        {(waiting || locked) && (
          <>
            <rect
              x="112"
              y="248"
              width="288"
              height="4"
              className="pq-muted-dot"
            />
            <motion.rect
              x="112"
              y="248"
              width={waiting ? retryWidth : lockWidth}
              height="4"
              className="pq-orange"
            />
          </>
        )}
        {otherPosts.map((post, index) => {
          const done = time >= post.ack + 1
          const active = time >= post.claim && !done
          return (
            <g
              key={post.id}
              className={`pq-job ${done ? "pq-job-complete" : active ? "pq-job-processing" : ""}`}
            >
              <rect
                x="96"
                y={300 + index * 48}
                width="328"
                height="36"
                rx="4"
              />
              <text x="112" y={323 + index * 48} className="pq-node-title">
                #{post.id}
              </text>
              <text
                x="408"
                y={323 + index * 48}
                textAnchor="end"
                className="pq-job-status"
              >
                {done ? "✓ done" : active ? "lock: W2" : "pending"}
              </text>
            </g>
          )
        })}
      </g>
      {!reducedMotion && (
        <>
          {otherPosts.map((post) => (
            <g key={`delivery-${post.id}`}>
              <Packet
                clock={clock}
                start={post.claim}
                duration={1.2}
                controlX={controlX}
                fromX={queueX}
                fromY={queueY}
                toX={workerX}
                toY={workerY(2)}
                label={`#${post.id}`}
              />
              <Packet
                clock={clock}
                start={post.ack}
                duration={1}
                controlX={controlX}
                fromX={workerX}
                fromY={workerY(2)}
                toX={queueX}
                toY={queueY}
                label="ACK"
                ack
              />
            </g>
          ))}
          {[
            { worker: 1, start: 1 },
            { worker: 2, start: 12 },
          ].map(({ worker, start }) => (
            <Packet
              key={worker}
              clock={clock}
              start={start}
              duration={1.2}
              controlX={controlX}
              fromX={queueX}
              fromY={queueY}
              toX={workerX}
              toY={workerY(worker)}
              label="#041"
            />
          ))}
          {refreshes.map(({ at, worker }) => (
            <Packet
              key={`refresh-${at}`}
              clock={clock}
              start={at - 0.8}
              duration={0.8}
              controlX={controlX}
              fromX={workerX}
              fromY={workerY(worker)}
              toX={queueX}
              toY={queueY}
              label="REFRESH"
            />
          ))}
          <g className="pq-failure-signal">
            <Packet
              clock={clock}
              start={6}
              duration={1}
              controlX={controlX}
              fromX={workerX}
              fromY={workerY(1)}
              toX={queueX}
              toY={queueY}
              label="FAIL"
            />
          </g>
          <Packet
            clock={clock}
            start={15}
            duration={1}
            controlX={controlX}
            fromX={workerX}
            fromY={workerY(2)}
            toX={queueX}
            toY={queueY}
            label="ACK"
            ack
          />
        </>
      )}
    </svg>
  )
}
