import { useId, useState } from "react"
import {
  AnimatePresence,
  motion,
  useTransform,
  type MotionValue,
} from "motion/react"
import { PersistedQueuePacket as Packet } from "./PersistedQueuePacket"
import {
  FailureDiagram,
  failureFrame,
  failureDuration,
} from "./PersistedQueueFailure"
import { CrashDiagram, crashFrame, crashDuration } from "./PersistedQueueCrash"
import { SimpleDiagram } from "./PersistedQueueSimple"
import { LockDiagram } from "./PersistedQueueLock"
import { AnimationFrame } from "../animation/AnimationFrame"
import { AnimationControls } from "../animation/AnimationControls"
import { useAnimationPlayback } from "../animation/useAnimationPlayback"
import "./PersistedQueueDemo.css"

type Mode = "fan-out" | "fan-in" | "many-to-many" | "failure" | "crash" | "lock"
const jobs = ["041", "042", "043"]

// A deterministic illustration of successful processing, not a live queue.
// Fan-in deliberately takes one job at a time; fan-out uses three workers.
function claimTime(mode: Mode, index: number) {
  if (mode === "many-to-many") return index === 0 ? 2 : 3 + index * 2
  return 4 + index * (mode === "fan-in" ? 3.6 : 0.6)
}

function offerTime(mode: Mode, index: number) {
  return index * (mode === "many-to-many" ? 2 : 0.55)
}

function processingDuration(mode: Mode) {
  return mode === "many-to-many" ? 5 : 1.4
}

// Illustrative infrastructure scaling, not a PersistedQueue feature.
function workerCount(time: number) {
  if (time < 4.2 || time >= 17) return 1
  if (time < 6.2 || time >= 15.5) return 2
  return 3
}

function frame(mode: Mode, time: number, index: number) {
  const claim = claimTime(mode, index)
  if (time < 1.6 + offerTime(mode, index)) return "offering"
  if (time < claim) return "pending"
  if (time < claim + 1.3) return "delivering"
  if (time < claim + 1.3 + processingDuration(mode)) return "processing"
  if (time < claim + 2.1 + processingDuration(mode)) return "acknowledging"
  return "complete"
}

function WorkerProgress({
  clock,
  start,
  duration,
}: {
  clock: MotionValue<number>
  start: number
  duration: number
}) {
  const width = useTransform(
    clock,
    (time) => 136 * Math.max(0, Math.min(1, (time - start) / duration)),
  )
  return (
    <motion.rect x="16" y="62" height="2" width={width} className="pq-orange" />
  )
}

export default function PersistedQueueDemo({
  simple = false,
  scenario,
}: {
  simple?: boolean
  scenario?: Mode
}) {
  const [selectedMode, setMode] = useState<Mode>("fan-out")
  const mode = scenario ?? selectedMode
  const multipleWorkers = mode !== "fan-in"
  const id = useId()
  const duration = simple
    ? 12
    : mode === "many-to-many"
      ? 19
      : mode === "lock"
        ? 19
        : mode === "crash"
          ? crashDuration
          : mode === "failure"
            ? failureDuration
            : claimTime(mode, 2) + 5.7
  const playback = useAnimationPlayback(duration)
  const { time, clock, figure, playing, compact, reducedMotion, restart } =
    playback
  const replicas =
    mode === "many-to-many" ? workerCount(time) : multipleWorkers ? 3 : 1
  const failure = failureFrame(time)
  const crash = crashFrame(time)
  const states = jobs.map((_, i) => frame(mode, time, i))
  const storedCount = states.filter((state) => state !== "offering").length
  const storeHeight = 60 + storedCount * 47
  const storeCenter = compact ? 480 : 210
  const storeTop = storeCenter - storeHeight / 2
  const storeTransition = {
    duration: reducedMotion ? 0 : 0.35,
    ease: "easeInOut" as const,
  }
  const done = states.filter((s) => s === "complete").length
  const isActive = (state: string) =>
    ["delivering", "processing", "acknowledging"].includes(state)
  const phase =
    mode === "crash"
      ? crash.phase
      : mode === "failure"
        ? failure.phase
        : time < 2.7
          ? 0
          : time < 4
            ? 1
            : done === 3
              ? 3
              : 2
  const explanation =
    mode === "crash"
      ? crash.explanation
      : mode === "failure"
        ? failure.explanation
        : phase === 0
          ? mode === "fan-out"
            ? "One upload API offers three image jobs to the thumbnails queue."
            : "Three upload API processes each offer an image job to the same thumbnails queue."
          : phase === 1
            ? "The shared store persists the jobs. Work can wait here independently of any process."
            : phase === 3
              ? "Successful handlers mark their jobs complete in the store. All three thumbnails are ready."
              : multipleWorkers
                ? "Three worker processes claim different jobs and create thumbnails in parallel."
                : "One worker claims each job, creates its thumbnail, and acknowledges completion before taking another."

  function selectMode(next: Mode) {
    setMode(next)
    restart()
  }

  return (
    <AnimationFrame
      ref={figure}
      className="pq-demo"
      data-running={playback.running}
      aria-label="Persisted queue across processes"
    >
      <div className="pq-toolbar">
        {simple ? (
          <span className="pq-example">UPLOAD → QUEUE → WORKER</span>
        ) : scenario ? (
          <span className="pq-example">
            {scenario === "failure"
              ? "FAILURE & RETRY"
              : scenario === "crash"
                ? "WORKER CRASH"
                : scenario.toUpperCase()}
          </span>
        ) : (
          <div className="pq-modes" role="group" aria-label="Queue topology">
            <button
              aria-pressed={mode === "fan-out"}
              onClick={() => selectMode("fan-out")}
            >
              Fan-out <span>1 → 3</span>
            </button>
            <button
              aria-pressed={mode === "fan-in"}
              onClick={() => selectMode("fan-in")}
            >
              Fan-in <span>3 → 1</span>
            </button>
            <button
              aria-pressed={mode === "failure"}
              onClick={() => selectMode("failure")}
            >
              Failure & retry
            </button>
            <button
              aria-pressed={mode === "crash"}
              onClick={() => selectMode("crash")}
            >
              Worker crash
            </button>
          </div>
        )}
        <span className="pq-example">LINKEDIN DE-SLOPPER</span>
      </div>

      <div
        className="pq-scroll"
        tabIndex={0}
        role="region"
        aria-label="Queue diagram, scroll horizontally on small screens"
      >
        {mode === "lock" ? (
          <LockDiagram
            clock={clock}
            time={time}
            reducedMotion={reducedMotion}
            mobile={compact}
          />
        ) : simple ? (
          <SimpleDiagram
            clock={clock}
            time={time}
            reducedMotion={reducedMotion}
          />
        ) : mode === "crash" ? (
          <CrashDiagram
            clock={clock}
            time={time}
            reducedMotion={reducedMotion}
          />
        ) : mode === "failure" ? (
          <FailureDiagram
            clock={clock}
            time={time}
            reducedMotion={reducedMotion}
            mobile={compact}
          />
        ) : (
          <svg
            className={`pq-topology ${compact ? "pq-topology-mobile" : ""}`}
            viewBox={compact ? "0 0 360 912" : "0 0 960 375"}
            role="img"
            aria-labelledby={`${id}-title ${id}-desc`}
          >
            <title id={`${id}-title`}>
              {mode === "many-to-many"
                ? "Three producers, three consumers"
                : mode === "fan-out"
                  ? "One producer, three consumers"
                  : "Three producers, one consumer"}
            </title>
            <desc id={`${id}-desc`}>
              {explanation} Each API and worker box is a separate process. All
              use the same named queue and persistence store.
            </desc>
            <defs>
              <marker
                id={`${id}-arrow`}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M1 1 L7 4 L1 7" fill="none" stroke="currentColor" />
              </marker>
            </defs>
            <text
              x={compact ? 96 : 48}
              y={compact ? 24 : 38}
              className="pq-label"
            >
              {mode === "fan-out" ? "PRODUCER" : "PRODUCERS"}
            </text>
            <text
              x={compact ? 58 : 374}
              y={compact ? 356 : 38}
              className="pq-label"
            >
              PERSISTED QUEUE
            </text>
            <text
              x={compact ? 96 : 744}
              y={compact ? 620 : 38}
              className="pq-label"
            >
              {replicas === 1 ? "CONSUMER" : "CONSUMERS"}
            </text>

            {(mode === "fan-out" ? [1] : [0, 1, 2]).map((i) => {
              const y = compact ? 76 + i * 86 : 105 + i * 105
              const offering =
                mode === "fan-out"
                  ? states.some((state) => state === "offering")
                  : states[i] === "offering"
              return (
                <g key={`producer-${i}`}>
                  <path
                    className={`pq-wire ${offering ? "pq-wire-active" : ""}`}
                    d={
                      compact
                        ? `M264 ${y} C340 ${y} 340 480 302 480`
                        : `M216 ${y} C287 ${y} 287 210 358 210`
                    }
                    markerEnd={`url(#${id}-arrow)`}
                  />
                  <g transform={`translate(${compact ? 96 : 48} ${y - 36})`}>
                    <rect className="pq-node" width="168" height="72" rx="4" />
                    <circle
                      cx="16"
                      cy="23"
                      r="3"
                      className={offering ? "pq-orange" : "pq-muted-dot"}
                    />
                    <text x="28" y="27" className="pq-node-title">
                      POST API {mode !== "fan-out" ? i + 1 : ""}
                    </text>
                    <text x="16" y="51" className="pq-small">
                      {offering ? "offer(post)" : "request done"}
                    </text>
                  </g>
                </g>
              )
            })}

            <AnimatePresence>
              {(multipleWorkers
                ? Array.from({ length: replicas }, (_, i) => i)
                : [1]
              ).map((i) => {
                const y = compact ? 680 + i * 86 : 105 + i * 105
                const jobIndex = multipleWorkers
                  ? i
                  : states.findIndex(isActive)
                const state = states[jobIndex]
                const processing = state !== undefined && isActive(state)
                const completed = multipleWorkers
                  ? states[i] === "complete"
                  : done === 3
                const job = jobs[jobIndex]
                return (
                  <motion.g
                    key={`consumer-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={storeTransition}
                  >
                    <path
                      className={`pq-wire ${processing ? "pq-wire-active" : ""}`}
                      d={
                        compact
                          ? `M58 480 C20 480 20 ${y} 96 ${y}`
                          : `M602 210 C673 210 673 ${y} 744 ${y}`
                      }
                      markerEnd={`url(#${id}-arrow)`}
                    />
                    <g transform={`translate(${compact ? 96 : 744} ${y - 36})`}>
                      <rect
                        className={`pq-node ${processing ? "pq-node-active" : ""}`}
                        width="168"
                        height="72"
                        rx="4"
                      />
                      <circle
                        cx="16"
                        cy="23"
                        r="3"
                        className={
                          completed
                            ? "pq-green"
                            : processing
                              ? "pq-orange"
                              : "pq-muted-dot"
                        }
                      />
                      <text x="28" y="27" className="pq-node-title">
                        WORKER {multipleWorkers ? i + 1 : "1"}
                      </text>
                      <text x="16" y="51" className="pq-small">
                        {processing
                          ? state === "delivering"
                            ? "take(handler)"
                            : `${state === "acknowledging" ? "ack" : "deslop"} #${job}`
                          : completed
                            ? "✓ ready"
                            : "take(handler)"}
                      </text>
                      {state === "processing" && !reducedMotion && (
                        <WorkerProgress
                          clock={clock}
                          start={claimTime(mode, jobIndex) + 1.3}
                          duration={processingDuration(mode)}
                        />
                      )}
                    </g>
                  </motion.g>
                )
              })}
            </AnimatePresence>

            <motion.g
              animate={{ x: compact ? -300 : 0, y: storeTop }}
              initial={false}
              transition={storeTransition}
            >
              <motion.rect
                x="358"
                y="0"
                width="244"
                animate={{ height: storeHeight }}
                initial={false}
                transition={storeTransition}
                rx="5"
                className="pq-store"
              />
              <path d="M358 42 H602" className="pq-divider" />
              <text x="376" y="26" className="pq-node-title">
                posts
              </text>
              {jobs.map(
                (job, i) =>
                  states[i] !== "offering" && (
                    <motion.g
                      key={job}
                      transform={`translate(376 ${54 + i * 47})`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={storeTransition}
                      className={`pq-job pq-job-${states[i]}`}
                    >
                      <rect width="208" height="36" rx="3" />
                      <text x="12" y="23">
                        #{job}
                      </text>
                      <text
                        x="196"
                        y="23"
                        textAnchor="end"
                        className="pq-job-status"
                      >
                        {states[i] === "complete"
                          ? "✓ done"
                          : isActive(states[i] ?? "")
                            ? `lock: W${multipleWorkers ? i + 1 : 1}`
                            : "pending"}
                      </text>
                    </motion.g>
                  ),
              )}
            </motion.g>
            {!reducedMotion &&
              jobs.map((job, i) => {
                const producerIndex = mode === "fan-out" ? 1 : i
                const workerIndex = multipleWorkers ? i : 1
                const producerY = compact
                  ? 76 + producerIndex * 86
                  : 105 + producerIndex * 105
                const workerY = compact
                  ? 680 + workerIndex * 86
                  : 105 + workerIndex * 105
                const claim = claimTime(mode, i)
                return (
                  <g key={`${mode}-${job}`}>
                    <Packet
                      clock={clock}
                      start={offerTime(mode, i)}
                      duration={1.6}
                      controlX={compact ? 340 : undefined}
                      fromX={compact ? 264 : 216}
                      fromY={producerY}
                      toX={compact ? 302 : 358}
                      toY={storeCenter}
                      label={`#${job}`}
                    />
                    <Packet
                      clock={clock}
                      start={claim}
                      duration={1.3}
                      controlX={compact ? 20 : undefined}
                      fromX={compact ? 58 : 602}
                      fromY={storeCenter}
                      toX={compact ? 96 : 744}
                      toY={workerY}
                      label={`#${job}`}
                    />
                    <Packet
                      clock={clock}
                      start={claim + 1.3 + processingDuration(mode)}
                      duration={0.8}
                      controlX={compact ? 20 : undefined}
                      fromX={compact ? 96 : 744}
                      fromY={workerY}
                      toX={compact ? 58 : 602}
                      toY={storeCenter}
                      label="ACK"
                      ack
                    />
                  </g>
                )
              })}
          </svg>
        )}
      </div>

      {!simple && mode === "crash" && (
        <>
          <div className="pq-phases" aria-label="Processing stages">
            {(mode === "crash"
              ? ["Claim", "Crash", "Recover", "Complete"]
              : mode === "failure"
                ? ["Claim", "Fail", "Retry", "Complete"]
                : ["Offer", "Persist", "Process", "Complete"]
            ).map((label, i) => (
              <div key={label} aria-current={phase === i ? "step" : undefined}>
                <span>0{i + 1}</span> {label}
              </div>
            ))}
          </div>
          <div className="pq-narration" aria-live={playing ? "off" : "polite"}>
            {explanation}
          </div>
        </>
      )}
      <AnimationControls
        playing={playing}
        onRestart={restart}
        onToggle={playback.toggle}
      />
    </AnimationFrame>
  )
}
