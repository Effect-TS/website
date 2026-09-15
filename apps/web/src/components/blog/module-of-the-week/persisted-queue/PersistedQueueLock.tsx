import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

const renewals = [
  { at: 3, worker: 1 },
  { at: 5, worker: 1 },
  { at: 7, worker: 1 },
  { at: 14, worker: 2 },
]

// Worker 2 handles other posts before retrying #041 after its lock expires.
const otherPosts = [
  { id: "042", claim: 0, ack: 2.8 },
  { id: "043", claim: 5.5, ack: 8 },
]

// Four-second lock. Worker 1 refreshes three times, then stops at second 8.
// Expiry at 11, reclaim at 12, acknowledgment arrives at 16.
export function lockFrame(time: number) {
  const complete = time >= 16
  const owner = time < 1 || complete ? 0 : time < 12 ? 1 : 2
  let renewedAt = owner === 2 ? 12 : 1
  for (const renewal of renewals) {
    if (renewal.worker === owner && renewal.at <= time) renewedAt = renewal.at
  }
  const remaining = owner === 0 ? 0 : Math.max(0, renewedAt + 4 - time)
  return {
    owner,
    remaining,
    offline: time >= 8,
    expired: time >= 11 && time < 12,
    complete,
    acknowledging: time >= 15 && !complete,
  }
}

export function LockDiagram({
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
  const { owner, remaining, offline, expired, complete, acknowledging } =
    lockFrame(time)
  const width = useTransform(clock, (t) => (lockFrame(t).remaining / 4) * 244)
  const queueX = mobile ? 30 : 440
  const workerX = mobile ? 110 : 680
  const workerY = (worker: number) =>
    mobile ? (worker === 1 ? 500 : 610) : worker === 1 ? 120 : 230
  const controlX = mobile ? 16 : 560
  return (
    <svg
      className={`pq-lock-demo ${mobile ? "pq-lock-mobile" : ""}`}
      viewBox={mobile ? "0 0 420 670" : "0 0 960 424"}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>
        A renewable lock reserves a job for one worker
      </title>
      <desc id={`${id}-desc`}>
        Worker 1 claims post 041 with a four-second lock and renews it three
        times. Worker 2 processes posts 042 and 043. Worker 1 goes offline, the
        lock expires, and worker 2 claims the job on a later poll. Worker 2
        finishes processing and acknowledges the job, releasing its lock.
        Timings are shortened for this illustration.
      </desc>
      <text x={mobile ? 30 : 80} y="40" className="pq-label">
        PERSISTED QUEUE
      </text>
      <text x={workerX} y={mobile ? 440 : 40} className="pq-label">
        CONSUMERS
      </text>
      {[1, 2].map((worker) => {
        const y = workerY(worker)
        const ownsLock = owner === worker && !expired
        const stopped = worker === 1 && offline
        const claim = worker === 1 ? 1 : 12
        const receiving = ownsLock && time < claim + 1.2
        const otherPost =
          worker === 2
            ? otherPosts.find(
                (post) => time >= post.claim && time < post.ack + 1,
              )
            : undefined
        const active = (ownsLock && !stopped) || otherPost !== undefined
        return (
          <g key={worker}>
            <path
              d={`M${queueX} 232 C${controlX} 232 ${controlX} ${y} ${workerX} ${y}`}
              className={`pq-wire ${active ? "pq-wire-active" : ""}`}
            />
            <g transform={`translate(${workerX} ${y - 36})`}>
              <rect
                width="200"
                height="72"
                rx="4"
                className={`pq-node ${stopped ? "pq-node-error" : active ? "pq-node-active" : ""}`}
                strokeWidth={stopped ? 2 : 1}
              />
              <text x="16" y="27" className="pq-node-title">
                WORKER {worker}
              </text>
              <text
                x="16"
                y="51"
                className={
                  stopped
                    ? "pq-error-text"
                    : complete && worker === 2
                      ? "pq-success-text"
                      : "pq-small"
                }
              >
                {stopped
                  ? "crashed"
                  : otherPost
                    ? time < otherPost.claim + 1.2
                      ? "take(handler)"
                      : `${time >= otherPost.ack ? "ack" : "deslop"} #${otherPost.id}`
                    : complete
                      ? "✓ ready"
                      : acknowledging
                        ? "ack #041"
                        : receiving
                          ? "take(handler)"
                          : ownsLock
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
        <g className={complete ? "pq-job pq-job-complete" : ""}>
          <rect
            x="96"
            y="124"
            width="328"
            height="164"
            rx="4"
            className="pq-node"
          />
          <text x="108" y="150" className="pq-node-title">
            #041
          </text>
          <text
            x="108"
            y="180"
            className={complete ? "pq-job-status" : "pq-small"}
          >
            {complete
              ? "✓ done"
              : owner === 0
                ? "pending"
                : expired
                  ? "Lock expired"
                  : `Locked by worker ${owner}`}
          </text>
          {owner !== 0 && (
            <>
              <text x="108" y="212" className="pq-small">
                Expires in {remaining.toFixed(1)}s
              </text>
              <rect
                x="108"
                y="232"
                width="244"
                height="4"
                className="pq-muted-dot"
              />
              <motion.rect
                x="108"
                y="232"
                width={width}
                height="4"
                className="pq-orange"
              />
            </>
          )}
          <text x="108" y="266" className="pq-small">
            {complete
              ? "Acknowledged · unlocked"
              : owner === 0
                ? "Ready to claim"
                : expired
                  ? "Waiting for a claim"
                  : offline && owner === 1
                    ? "No more renewals"
                    : "Refresh extends lock expiry"}
          </text>
        </g>
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
              <text x="108" y={323 + index * 48} className="pq-node-title">
                #{post.id}
              </text>
              <text
                x="412"
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
      {!reducedMotion &&
        otherPosts.map((post) => (
          <g key={`delivery-${post.id}`}>
            <Packet
              clock={clock}
              start={post.claim}
              duration={1.2}
              controlX={controlX}
              fromX={queueX}
              fromY={232}
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
              toY={232}
              label="ACK"
              ack
            />
          </g>
        ))}
      {!reducedMotion &&
        [1, 2].map((worker) => (
          <Packet
            key={worker}
            clock={clock}
            start={worker === 1 ? 1 : 12}
            duration={1.2}
            controlX={controlX}
            fromX={queueX}
            fromY={232}
            toX={workerX}
            toY={workerY(worker)}
            label="#041"
          />
        ))}
      {!reducedMotion &&
        renewals.map(({ at, worker }) => (
          <Packet
            key={`refresh-${at}`}
            clock={clock}
            start={at - 0.8}
            duration={0.8}
            controlX={controlX}
            fromX={workerX}
            fromY={workerY(worker)}
            toX={queueX}
            toY={232}
            label="REFRESH"
          />
        ))}
      {!reducedMotion && (
        <Packet
          clock={clock}
          start={15}
          duration={1}
          controlX={controlX}
          fromX={workerX}
          fromY={workerY(2)}
          toX={queueX}
          toY={232}
          label="ACK"
          ack
        />
      )}
    </svg>
  )
}
