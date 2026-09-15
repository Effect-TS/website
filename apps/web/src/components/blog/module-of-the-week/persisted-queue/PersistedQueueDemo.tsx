import { useEffect, useId, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
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
  const [time, setTime] = useState(0)
  const replicas =
    mode === "many-to-many" ? workerCount(time) : multipleWorkers ? 3 : 1
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const figure = useRef<HTMLElement>(null)
  const clock = useMotionValue(0)
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
  const failure = failureFrame(time)
  const crash = crashFrame(time)
  const states = jobs.map((_, i) => frame(mode, time, i))
  const storedCount = states.filter((state) => state !== "offering").length
  const storeHeight = 125 + storedCount * 47
  const storeTop = 210 - storeHeight / 2
  const storeTransition = {
    duration: reducedMotion ? 0 : 0.35,
    ease: "easeInOut" as const,
  }
  const done = states.filter((s) => s === "complete").length
  const pending = states.filter((s) => s === "pending").length
  const isActive = (state: string) =>
    ["delivering", "processing", "acknowledging"].includes(state)
  const active = states.filter(isActive).length
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

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      setReducedMotion(preference.matches)
      setPlaying(!preference.matches)
    }
    update()
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    let inView = false
    const update = () => setVisible(inView && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false
      update()
    })
    if (figure.current) observer.observe(figure.current)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  useEffect(() => {
    if (!playing || !visible) return
    let previous: number | undefined
    let request: number
    const tick = (now: number) => {
      if (previous !== undefined) {
        const next = (clock.get() + (now - previous) / 1000) % duration
        clock.set(next)
        // Text and queue states need only 10 updates per second.
        setTime((old) =>
          Math.floor(old * 10) === Math.floor(next * 10) ? old : next,
        )
      }
      previous = now
      request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, visible, clock, duration])

  function restart() {
    clock.set(0)
    setTime(0)
  }

  function selectMode(next: Mode) {
    setMode(next)
    restart()
  }

  return (
    <figure
      ref={figure}
      className="pq-demo"
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
          />
        ) : (
          <svg
            className="pq-topology"
            viewBox="0 0 960 420"
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
            <text x="48" y="38" className="pq-label">
              {mode === "fan-out" ? "01 PRODUCER" : "03 PRODUCERS"}
            </text>
            <text x="374" y="38" className="pq-label">
              SHARED PERSISTENCE
            </text>
            <text x="744" y="38" className="pq-label">
              {replicas === 1 ? "01 CONSUMER" : `0${replicas} CONSUMERS`}
            </text>

            {(mode === "fan-out" ? [1] : [0, 1, 2]).map((i) => {
              const y = 105 + i * 105
              const offering =
                mode === "fan-out"
                  ? states.some((state) => state === "offering")
                  : states[i] === "offering"
              return (
                <g key={`producer-${i}`}>
                  <path
                    className={`pq-wire ${offering ? "pq-wire-active" : ""}`}
                    d={`M216 ${y} C287 ${y} 287 210 358 210`}
                    markerEnd={`url(#${id}-arrow)`}
                  />
                  <g transform={`translate(48 ${y - 36})`}>
                    <rect className="pq-node" width="168" height="72" rx="4" />
                    <circle
                      cx="16"
                      cy="23"
                      r="3"
                      className={offering ? "pq-orange" : "pq-muted-dot"}
                    />
                    <text x="28" y="27" className="pq-node-title">
                      UPLOAD API {mode !== "fan-out" ? i + 1 : ""}
                    </text>
                    <text x="16" y="51" className="pq-small">
                      {offering
                        ? "offer(image)"
                        : mode === "fan-out"
                          ? "jobs stored"
                          : "job stored"}
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
                const y = 105 + i * 105
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
                      d={`M602 210 C673 210 673 ${y} 744 ${y}`}
                      markerEnd={`url(#${id}-arrow)`}
                    />
                    <g transform={`translate(744 ${y - 36})`}>
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
                          ? `${state === "delivering" ? "receiving" : state === "acknowledging" ? "ack" : "resize"} #${job}`
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

            {mode === "many-to-many" && (
              <text x="480" y="395" textAnchor="middle" className="pq-small">
                Infrastructure autoscaling · {replicas}{" "}
                {replicas === 1 ? "worker" : "workers"}
                {time >= 15.5
                  ? " · scale down"
                  : time >= 4.2 && time < 7
                    ? " · scale up"
                    : ""}
              </text>
            )}

            <motion.g
              animate={{ y: storeTop }}
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
                QUEUE STORE
              </text>
              <text x="584" y="26" textAnchor="end" className="pq-small">
                durable
              </text>
              <text x="376" y="71" className="pq-small">
                queue: "thumbnails"
              </text>
              {jobs.map(
                (job, i) =>
                  states[i] !== "offering" && (
                    <motion.g
                      key={job}
                      transform={`translate(376 ${89 + i * 47})`}
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
              <motion.text
                x="376"
                animate={{ y: storeHeight - 17 }}
                initial={false}
                transition={storeTransition}
                className="pq-small"
              >
                {storedCount === 0
                  ? "Empty"
                  : `${pending} waiting · ${active} active`}
              </motion.text>
            </motion.g>
            {!reducedMotion &&
              jobs.map((job, i) => {
                const producerY = mode === "fan-out" ? 210 : 105 + i * 105
                const workerY = multipleWorkers ? 105 + i * 105 : 210
                const claim = claimTime(mode, i)
                return (
                  <g key={`${mode}-${job}`}>
                    <Packet
                      clock={clock}
                      start={offerTime(mode, i)}
                      duration={1.6}
                      fromX={216}
                      fromY={producerY}
                      toX={358}
                      toY={210}
                      label={`#${job}`}
                    />
                    <Packet
                      clock={clock}
                      start={claim}
                      duration={1.3}
                      fromX={602}
                      fromY={210}
                      toX={744}
                      toY={workerY}
                      label={`#${job}`}
                    />
                    <Packet
                      clock={clock}
                      start={claim + 1.3 + processingDuration(mode)}
                      duration={0.8}
                      fromX={744}
                      fromY={workerY}
                      toX={602}
                      toY={210}
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
      <div className="pq-controls">
        <div>
          <button aria-label="Restart animation" onClick={restart}>
            ↻ Restart
          </button>
          <button
            className="pq-play"
            onClick={() => {
              setPlaying((p) => !p)
            }}
          >
            {playing ? "Ⅱ Pause" : "▷ Play"}
          </button>
        </div>
      </div>
    </figure>
  )
}
