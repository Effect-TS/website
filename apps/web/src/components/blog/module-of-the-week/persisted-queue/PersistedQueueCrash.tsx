import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

export const crashDuration = 17
const renewals = [
  { at: 3, worker: 1 },
  { at: 5, worker: 1 },
  { at: 11.8, worker: 2 },
]

// Demo lock expiration is 4s. Worker 1 last refreshes at t=5, dies at t=6,
// and its lock expires at t=9. SQL leaves the old owner in the row until
// worker 2's next poll claims it at t=9.8. No failure finalizer runs.
function lockRemaining(time: number) {
  if (time < 1 || time >= 14) return 0
  const acquired = time >= 9.8 ? 9.8 : 1
  const refreshed = renewals.reduce(
    (last, renewal) => (renewal.at <= time ? Math.max(last, renewal.at) : last),
    acquired,
  )
  return Math.max(0, refreshed + 4 - time)
}

export function crashFrame(time: number) {
  const stage =
    time < 1
      ? "ready"
      : time < 2.2
        ? "claim"
        : time < 6
          ? "process"
          : time < 9
            ? "dead"
            : time < 9.8
              ? "expired"
              : time < 11
                ? "reclaim"
                : time < 13
                  ? "recover"
                  : time < 14
                    ? "ack"
                    : "complete"
  const attempt = time < 1 ? 0 : time < 9.8 ? 1 : 2
  const lock =
    stage === "ready" || stage === "complete"
      ? "none"
      : stage === "expired"
        ? "expired"
        : attempt === 1
          ? "worker-1"
          : "worker-2"
  const phase = time < 6 ? 0 : time < 9 ? 1 : time < 14 ? 2 : 3
  const explanation =
    stage === "ready"
      ? "Worker 1 calls take. The job is already stored."
      : stage === "claim"
        ? "Worker 1 claims the job and acquires its lock. Attempts becomes 1."
        : stage === "process"
          ? "Each renewal resets the lock countdown to 4 seconds. The worker keeps its claim alive."
          : stage === "dead"
            ? time < 7.8
              ? "Worker 1 dies. Renewals stop, and the remaining lock time counts down to zero."
              : "Worker 2's take waits. The dead worker's lock is still valid."
            : stage === "expired"
              ? "The lock expires. The stored job can now be claimed by another worker."
              : stage === "reclaim"
                ? "Worker 2's pending take claims the job on its next poll. Attempts becomes 2."
                : stage === "recover"
                  ? "Worker 2 restarts the handler for the same job. The crashed attempt still counts."
                  : stage === "ack"
                    ? "Worker 2 succeeds, marks the job complete, and releases its lock."
                    : "The job survived the crash. Worker 2 completed it on attempt 2."
  return { stage, attempt, lock, phase, explanation }
}

function ExpiryBar({ clock }: { clock: MotionValue<number> }) {
  const width = useTransform(clock, (time) => (220 * lockRemaining(time)) / 4)
  return (
    <motion.rect
      x="628"
      y="294"
      height="4"
      width={width}
      className="pq-orange"
    />
  )
}

export function CrashDiagram({
  clock,
  time,
  reducedMotion,
}: {
  clock: MotionValue<number>
  time: number
  reducedMotion: boolean
}) {
  const id = useId()
  const { stage, attempt, lock, explanation } = crashFrame(time)
  const dead = time >= 6
  const waiting = time >= 6.8 && time < 9.8
  const complete = stage === "complete"
  const firstOwns = lock === "worker-1"
  const secondOwns = lock === "worker-2"
  const held = firstOwns || secondOwns
  return (
    <svg
      viewBox="0 0 960 420"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      data-stage={stage}
      data-attempt={attempt}
      data-lock={lock}
    >
      <title id={`${id}-title`}>Recovering a job after a worker dies</title>
      <desc id={`${id}-desc`}>
        {explanation} Demo settings: lock expiration 4 seconds, maxAttempts 3.
        Worker 1 last renews at 5 seconds and dies at 6 seconds. Its lock
        expires at 9 seconds.
      </desc>
      <text x="80" y="42" className="pq-label">
        WORKER CRASH · ONE PERSISTED JOB
      </text>
      <text x="880" y="42" textAnchor="end" className="pq-label">
        DEMO LOCK 4s · MAX ATTEMPTS 3
      </text>

      <path
        d="M320 145 C460 145 460 190 600 190"
        className={`pq-wire ${firstOwns && !dead ? "pq-wire-active" : ""}`}
      />
      <text x="460" y="143" textAnchor="middle" className="pq-small">
        {dead
          ? "no more refreshes"
          : stage === "ready"
            ? "take →"
            : stage === "process"
              ? "renew →"
              : "← job"}
      </text>
      <path
        d="M320 305 C460 305 460 230 600 230"
        className={`pq-wire ${secondOwns ? "pq-wire-active" : ""}`}
      />
      <text x="460" y="304" textAnchor="middle" className="pq-small">
        {waiting
          ? "take pending"
          : stage === "ack"
            ? "success →"
            : attempt === 2
              ? "← job"
              : "take →"}
      </text>

      <g data-node="store">
        <rect
          x="600"
          y="100"
          width="280"
          height="218"
          rx="5"
          className="pq-store"
        />
        <path d="M600 142 H880" className="pq-divider" />
        <text x="622" y="126" className="pq-node-title">
          SQL STORE
        </text>
        <text x="858" y="126" textAnchor="end" className="pq-small">
          thumbnails
        </text>
        <rect
          x="620"
          y="160"
          width="240"
          height="94"
          rx="4"
          className={`pq-node ${held ? "pq-node-active" : ""}`}
        />
        <text x="636" y="185" className="pq-node-title">
          #041
        </text>
        <text x="844" y="185" textAnchor="end" className="pq-small">
          attempts {attempt}
        </text>
        <g className={`pq-lock ${held ? "pq-lock-held" : ""}`}>
          <rect x="636" y="202" width="208" height="34" rx="3" />
          <path
            d={
              held
                ? "M650 216 v-4 a5 5 0 0 1 10 0 v4"
                : "M650 216 v-4 a5 5 0 0 1 10 0"
            }
          />
          <rect x="648" y="216" width="14" height="11" rx="2" />
          <text x="672" y="224">
            {firstOwns
              ? "Lock held · worker 1"
              : secondOwns
                ? "Lock held · worker 2"
                : lock === "expired"
                  ? "Lock expired"
                  : complete
                    ? "Lock released"
                    : "No lock"}
          </text>
        </g>
        <text
          x="628"
          y="279"
          className={complete ? "pq-success-text" : "pq-small"}
        >
          {held
            ? `Expires in ${lockRemaining(time).toFixed(1)}s`
            : lock === "expired"
              ? "0.0s · ready for another claim"
              : complete
                ? "✓ complete"
                : "Ready"}
        </text>
        {(held || lock === "expired") && (
          <>
            <rect
              x="628"
              y="294"
              width="220"
              height="4"
              fill="var(--pq-border)"
            />
            {!reducedMotion && <ExpiryBar clock={clock} />}
          </>
        )}
      </g>

      <motion.g
        data-node="worker-1"
        data-dead={dead}
        animate={{ opacity: dead ? 0.45 : 1 }}
        initial={false}
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
      >
        <rect
          x="80"
          y="80"
          width="240"
          height="116"
          rx="5"
          className={`pq-node ${!dead && firstOwns ? "pq-node-active" : ""}`}
        />
        <path d="M80 122 H320" className="pq-divider" />
        <circle
          cx="102"
          cy="103"
          r="3"
          className={dead ? "pq-red" : firstOwns ? "pq-orange" : "pq-muted-dot"}
        />
        <text x="116" y="107" className="pq-node-title">
          WORKER 1
        </text>
        <text x="102" y="151" className="pq-node-title">
          {dead
            ? "× process exited"
            : stage === "process"
              ? "resize(image)"
              : "take(handler)"}
        </text>
        <text x="102" y="178" className="pq-small">
          {dead
            ? "Renewals stopped"
            : stage === "process"
              ? "Sending lock renewals"
              : attempt > 0
                ? "Attempt 1"
                : "Waiting for a job"}
        </text>
      </motion.g>

      <g data-node="worker-2" data-pending={waiting}>
        <rect
          x="80"
          y="240"
          width="240"
          height="116"
          rx="5"
          className={`pq-node ${secondOwns ? "pq-node-active" : ""}`}
        />
        <path d="M80 282 H320" className="pq-divider" />
        <circle
          cx="102"
          cy="263"
          r="3"
          className={
            complete || stage === "ack"
              ? "pq-green"
              : secondOwns
                ? "pq-orange"
                : "pq-muted-dot"
          }
        />
        <text x="116" y="267" className="pq-node-title">
          WORKER 2
        </text>
        <text x="102" y="311" className="pq-node-title">
          {waiting
            ? "take pending…"
            : stage === "recover"
              ? "resize(image)"
              : stage === "ack" || complete
                ? "✓ thumbnail ready"
                : "take(handler)"}
        </text>
        <text x="102" y="338" className="pq-small">
          {waiting
            ? lock === "expired"
              ? "Next poll can claim"
              : "Waiting · lock still valid"
            : attempt === 2
              ? "Attempt 2"
              : "Handler has not run"}
        </text>
      </g>

      <text x="80" y="389" className="pq-small">
        {dead && attempt === 1
          ? "A crash does not release the lock."
          : "Recovery uses the same stored job."}
      </text>
      <text x="880" y="389" textAnchor="end" className="pq-small">
        {complete
          ? "1 crashed → 2 succeeded"
          : "Lock expiry, not retry backoff"}
      </text>

      {!reducedMotion && (
        <>
          {[
            { start: 0, fromY: 145, toY: 190 },
            { start: 6.8, fromY: 305, toY: 230 },
          ].map(({ start, fromY, toY }) => (
            <Packet
              key={start}
              clock={clock}
              start={start}
              duration={1}
              fromX={320}
              fromY={fromY}
              toX={600}
              toY={toY}
              label="TAKE"
            />
          ))}
          {[
            { start: 1, fromY: 190, toY: 145 },
            { start: 9.8, fromY: 230, toY: 305 },
          ].map(({ start, fromY, toY }) => (
            <Packet
              key={start}
              clock={clock}
              start={start}
              duration={1.2}
              fromX={600}
              fromY={fromY}
              toX={320}
              toY={toY}
              label="#041"
            />
          ))}
          {renewals.map(({ at, worker }) => (
            <Packet
              key={at}
              clock={clock}
              start={at - 0.8}
              duration={0.8}
              fromX={320}
              fromY={worker === 1 ? 145 : 305}
              toX={600}
              toY={worker === 1 ? 190 : 230}
              label="RENEW"
            />
          ))}
          <Packet
            clock={clock}
            start={13}
            duration={1}
            fromX={320}
            fromY={305}
            toX={600}
            toY={230}
            label="ACK"
            ack
          />
        </>
      )}
    </svg>
  )
}
