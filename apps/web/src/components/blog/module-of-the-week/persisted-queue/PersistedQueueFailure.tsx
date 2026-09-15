import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"

export const failureDuration = 16

// Worker 2's take waits through worker 1's lock and the retry delay, then
// claims the same job. Waiting/polling does not consume an attempt.
// Claims increment attempts; the scoped finalizer releases the worker lock.
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
            : time < 9
              ? "wait"
              : time < 10.2
                ? "reclaim"
                : time < 12
                  ? "retry"
                  : time < 13
                    ? "ack"
                    : "complete"
  const attempt = time < 1 ? 0 : time < 9 ? 1 : 2
  const locked = stage !== "ready" && stage !== "wait" && stage !== "complete"
  const phase = time < 6 ? 0 : time < 7 ? 1 : time < 13 ? 2 : 3
  const explanation =
    stage === "ready"
      ? "The job is stored. Worker 1 calls take."
      : stage === "claim"
        ? "Claiming the job acquires its lock and increments attempts to 1."
        : stage === "process"
          ? time < 3.3
            ? "Worker 2 calls take while worker 1 holds the lock."
            : "Worker 2's take stays pending. Its handler does not run; attempts stays at 1."
          : stage === "fail"
            ? "The handler fails. The finalizer releases the lock; take returns the error."
            : stage === "wait"
              ? "The lock is released, but the retry delay keeps worker 2's take waiting."
              : stage === "reclaim"
                ? "The delay ends. Worker 2's pending take claims the job and increments attempts to 2."
                : stage === "retry"
                  ? "Worker 2 now runs the handler, holding its own lock."
                  : stage === "ack"
                    ? "The handler succeeds. The finalizer marks the job complete and releases the lock."
                    : "Complete. One job, two attempts, no lock left behind."
  return { stage, attempt, locked, phase, explanation }
}

function RetryDelay({ clock }: { clock: MotionValue<number> }) {
  const width = useTransform(
    clock,
    (time) => 220 * Math.max(0, Math.min(1, (9 - time) / 2)),
  )
  return (
    <motion.rect
      x="108"
      y="285"
      height="3"
      width={width}
      className="pq-orange"
    />
  )
}

export function FailureDiagram({
  clock,
  time,
  reducedMotion,
}: {
  clock: MotionValue<number>
  time: number
  reducedMotion: boolean
}) {
  const id = useId()
  const { stage, attempt, locked, explanation } = failureFrame(time)
  const complete = stage === "complete"
  const failed = stage === "fail"
  const waiting = stage === "wait"
  const owner = locked ? attempt : 0
  const worker2Waiting = time >= 2.3 && time < 9
  return (
    <svg
      className="pq-failure-demo"
      viewBox="0 0 960 420"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      data-stage={stage}
      data-attempt={attempt}
      data-locked={locked}
    >
      <title id={`${id}-title`}>One failed job, retried</title>
      <desc id={`${id}-desc`}>
        {explanation} Worker 1 fails; worker 2 succeeds on attempt 2. Worker 2
        calls take only once, waiting through the lock and retry delay.
        maxAttempts is set to 3.
      </desc>
      <text x="80" y="42" className="pq-label">
        ONE JOB · TWO WORKERS · RETRY DELAY 2s
      </text>
      <text x="880" y="42" textAnchor="end" className="pq-label">
        MAX ATTEMPTS 3
      </text>

      <path
        d="M640 145 C500 145 500 190 360 190"
        className={`pq-wire ${owner === 1 ? "pq-wire-active" : ""}`}
      />
      <text
        x="500"
        y="143"
        textAnchor="middle"
        className={failed ? "pq-error-text" : "pq-small"}
      >
        {failed ? "← failure" : stage === "ready" ? "← take" : "job →"}
      </text>
      <path
        d="M640 305 C500 305 500 230 360 230"
        className={`pq-wire ${owner === 2 ? "pq-wire-active" : ""}`}
      />
      <text x="500" y="304" textAnchor="middle" className="pq-small">
        {worker2Waiting
          ? "take pending"
          : stage === "ack"
            ? "← success"
            : attempt === 2
              ? "job →"
              : "← take"}
      </text>

      <g data-node="store">
        <rect
          x="80"
          y="100"
          width="280"
          height="218"
          rx="5"
          className="pq-store"
        />
        <path d="M80 142 H360" className="pq-divider" />
        <text x="102" y="126" className="pq-node-title">
          SQL STORE
        </text>
        <text x="338" y="126" textAnchor="end" className="pq-small">
          thumbnails
        </text>

        <rect
          x="100"
          y="160"
          width="240"
          height="94"
          rx="4"
          className={`pq-node ${locked ? "pq-node-active" : ""}`}
        />
        <text x="116" y="185" className="pq-node-title">
          #041
        </text>
        <text x="324" y="185" textAnchor="end" className="pq-small">
          attempts {attempt}
        </text>
        <g
          className={`pq-lock ${locked ? "pq-lock-held" : ""}`}
          data-lock={locked ? "held" : "released"}
        >
          <rect x="116" y="202" width="208" height="34" rx="3" />
          <path
            d={
              locked
                ? "M130 216 v-4 a5 5 0 0 1 10 0 v4"
                : "M130 216 v-4 a5 5 0 0 1 10 0"
            }
          />
          <rect x="128" y="216" width="14" height="11" rx="2" />
          <text x="152" y="224">
            {locked
              ? `Worker ${owner} lock`
              : complete
                ? "Lock released"
                : waiting
                  ? "Lock released"
                  : "No lock"}
          </text>
        </g>
        <text
          x="108"
          y="279"
          className={complete ? "pq-success-text" : "pq-small"}
        >
          {waiting
            ? `Retry in ${(9 - time).toFixed(1)}s`
            : complete
              ? "✓ complete"
              : locked
                ? "Reserved for this worker"
                : "Ready"}
        </text>
        {waiting && !reducedMotion && <RetryDelay clock={clock} />}
      </g>

      <g transform="translate(0 -54)" data-node="worker-1">
        <rect
          x="640"
          y="134"
          width="240"
          height="116"
          rx="5"
          className={`pq-node ${failed ? "pq-node-error" : owner === 1 ? "pq-node-active" : ""}`}
        />
        <path d="M640 184 H880" className="pq-divider" />
        <circle
          cx="662"
          cy="165"
          r="3"
          className={
            failed ? "pq-red" : owner === 1 ? "pq-orange" : "pq-muted-dot"
          }
        />
        <text x="676" y="169" className="pq-node-title">
          WORKER 1
        </text>
        <text
          x="662"
          y="215"
          className={`pq-node-title ${time >= 6 ? "pq-error-text" : ""}`}
        >
          {stage === "process"
            ? "resize(image)"
            : time >= 6
              ? "× ResizeError"
              : "take(handler)"}
        </text>
        <text x="662" y="237" className="pq-small">
          {time >= 7
            ? "Attempt 1 failed"
            : attempt > 0
              ? "Attempt 1"
              : "Waiting for a job"}
        </text>
      </g>

      <g
        transform="translate(560 0)"
        data-node="worker-2"
        data-pending={worker2Waiting}
      >
        <rect
          x="80"
          y="240"
          width="240"
          height="116"
          rx="5"
          className={`pq-node ${owner === 2 ? "pq-node-active" : ""}`}
        />
        <path d="M80 282 H320" className="pq-divider" />
        <circle
          cx="102"
          cy="263"
          r="3"
          className={
            complete || stage === "ack"
              ? "pq-green"
              : owner === 2
                ? "pq-orange"
                : "pq-muted-dot"
          }
        />
        <text x="116" y="267" className="pq-node-title">
          WORKER 2
        </text>
        <text x="102" y="311" className="pq-node-title">
          {worker2Waiting
            ? "take pending…"
            : stage === "retry"
              ? "resize(image)"
              : stage === "ack" || complete
                ? "✓ thumbnail ready"
                : "take(handler)"}
        </text>
        <text x="102" y="338" className="pq-small">
          {worker2Waiting
            ? waiting
              ? "Waiting · retry delay"
              : "Waiting · job is locked"
            : attempt === 2
              ? "Attempt 2"
              : "Handler has not run"}
        </text>
      </g>

      {!reducedMotion && (
        <>
          {[
            { start: 0, fromY: 145, toY: 190 },
            { start: 2.3, fromY: 305, toY: 230 },
          ].map(({ start, fromY, toY }) => (
            <Packet
              key={start}
              clock={clock}
              start={start}
              duration={1}
              fromX={640}
              fromY={fromY}
              toX={360}
              toY={toY}
              label="TAKE"
            />
          ))}
          {[
            { start: 1, fromY: 190, toY: 145 },
            { start: 9, fromY: 230, toY: 305 },
          ].map(({ start, fromY, toY }) => (
            <Packet
              key={start}
              clock={clock}
              start={start}
              duration={1.2}
              fromX={360}
              fromY={fromY}
              toX={640}
              toY={toY}
              label="#041"
            />
          ))}
          <g className="pq-failure-signal">
            <Packet
              clock={clock}
              start={6}
              duration={1}
              fromX={640}
              fromY={145}
              toX={360}
              toY={190}
              label="FAIL"
            />
          </g>
          <Packet
            clock={clock}
            start={12}
            duration={1}
            fromX={640}
            fromY={305}
            toX={360}
            toY={230}
            label="ACK"
            ack
          />
        </>
      )}
    </svg>
  )
}
