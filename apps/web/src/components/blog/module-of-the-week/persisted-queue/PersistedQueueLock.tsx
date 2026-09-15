import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

const renewals = [
  { at: 3, worker: 1 },
  { at: 5, worker: 1 },
  { at: 7, worker: 1 },
  { at: 14, worker: 2 },
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
}: {
  clock: MotionValue<number>
  time: number
  reducedMotion: boolean
}) {
  const id = useId()
  const { owner, remaining, offline, expired, complete, acknowledging } =
    lockFrame(time)
  const width = useTransform(clock, (t) => (lockFrame(t).remaining / 4) * 244)
  return (
    <svg
      className="pq-lock-demo"
      viewBox="0 0 960 330"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>
        A renewable lock reserves a job for one worker
      </title>
      <desc id={`${id}-desc`}>
        Worker 1 claims a four-second lock and renews it three times. Worker 2
        waits. Worker 1 goes offline, the lock expires, and worker 2 claims the
        job on a later poll. Worker 2 finishes processing and acknowledges the
        job, releasing its lock. Timings are shortened for this illustration.
      </desc>
      <text x="80" y="40" className="pq-label">
        PERSISTED QUEUE
      </text>
      <text x="680" y="40" className="pq-label">
        WORKERS
      </text>
      {[1, 2].map((worker) => {
        const y = worker === 1 ? 120 : 230
        const ownsLock = owner === worker && !expired
        const stopped = worker === 1 && offline
        const claim = worker === 1 ? 1 : 12
        const receiving = ownsLock && time < claim + 1.2
        return (
          <g key={worker}>
            <path
              d={`M440 181 C560 181 560 ${y} 680 ${y}`}
              className={`pq-wire ${ownsLock && !stopped ? "pq-wire-active" : ""}`}
            />
            <g transform={`translate(680 ${y - 36})`}>
              <rect
                width="200"
                height="72"
                rx="4"
                className={`pq-node ${ownsLock && !stopped ? "pq-node-active" : ""}`}
              />
              <text x="16" y="27" className="pq-node-title">
                WORKER {worker}
              </text>
              <text
                x="16"
                y="51"
                className={
                  complete && worker === 2 ? "pq-success-text" : "pq-small"
                }
              >
                {stopped
                  ? "offline"
                  : complete
                    ? "✓ complete"
                    : acknowledging
                      ? "sending ACK"
                      : receiving
                        ? "receiving #041"
                        : ownsLock
                          ? "processing #041"
                          : "waiting"}
              </text>
            </g>
          </g>
        )
      })}
      <rect
        x="80"
        y="64"
        width="360"
        height="240"
        rx="5"
        className="pq-store"
      />
      <text x="108" y="94" className="pq-node-title">
        thumbnails
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
          JOB #041
        </text>
        <text
          x="108"
          y="180"
          className={complete ? "pq-job-status" : "pq-small"}
        >
          {complete
            ? "✓ complete"
            : owner === 0
              ? "Unclaimed"
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
      {!reducedMotion &&
        [1, 2].map((worker) => (
          <Packet
            key={worker}
            clock={clock}
            start={worker === 1 ? 1 : 12}
            duration={1.2}
            fromX={440}
            fromY={181}
            toX={680}
            toY={worker === 1 ? 120 : 230}
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
            fromX={680}
            fromY={worker === 1 ? 120 : 230}
            toX={440}
            toY={181}
            label="REFRESH"
          />
        ))}
      {!reducedMotion && (
        <Packet
          clock={clock}
          start={15}
          duration={1}
          fromX={680}
          fromY={230}
          toX={440}
          toY={181}
          label="ACK"
          ack
        />
      )}
    </svg>
  )
}
