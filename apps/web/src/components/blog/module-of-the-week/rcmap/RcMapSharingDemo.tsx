import { useId } from "react"
import { motion, useTransform, type MotionValue } from "motion/react"
import { AnimationFrame } from "../animation/AnimationFrame"
import { AnimationControls } from "../animation/AnimationControls"
import { AnimationPacket } from "../animation/AnimationPacket"
import { useAnimationPlayback } from "../animation/useAnimationPlayback"
import { mailboxDuration, mailboxFrame, mailboxSteps } from "./mailboxTimeline"
import "./RcMapSharingDemo.css"

function ReferenceDecrement({
  clock,
  at,
  x,
  y,
  reducedMotion,
}: {
  clock: MotionValue<number>
  at: number
  x: number
  y: number
  reducedMotion: boolean
}) {
  const opacity = useTransform(clock, (time) =>
    reducedMotion ? 1 : Math.max(0, 1 - (time - at)),
  )
  const rise = useTransform(clock, (time) =>
    reducedMotion ? 0 : -12 * Math.max(0, Math.min(1, time - at)),
  )
  return (
    <motion.text
      x={x}
      y={y}
      style={{ opacity, y: rise }}
      className="rcmap-decrement"
      aria-hidden="true"
    >
      −1
    </motion.text>
  )
}

export default function RcMapSharingDemo() {
  const playback = useAnimationPlayback(mailboxDuration)
  const { time, compact, reducedMotion } = playback
  const frame = mailboxFrame(time)
  const currentStep = mailboxSteps[frame.step] ?? mailboxSteps[0]
  const id = useId()
  const callerX = compact ? 16 : 48
  const callerWidth = compact ? 160 : 230
  const workerX = compact ? 224 : 600
  const workerWidth = compact ? 160 : 312
  const transition = { duration: reducedMotion || !playback.running ? 0 : 0.35 }

  return (
    <AnimationFrame
      ref={playback.figure}
      className="rcmap-demo"
      data-running={playback.running}
      aria-label="Ghostwriter shared worker resources"
    >
      <div className="rcmap-toolbar">
        <span>GHOSTWRITER</span>
        <span>SHARED WORKERS</span>
      </div>
      <svg
        viewBox={compact ? "0 0 400 492" : "0 0 960 464"}
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          Independent reply handlers share running Ghostwriter workers
        </title>
        <desc id={`${id}-description`}>
          {currentStep.explanation} Alice: {frame.workers[0]?.references}{" "}
          references. Bob: {frame.workers[1]?.references} references. Filled
          dots indicate held references. Closing a scope removes its reference
          immediately; the worker stops after its final reference is gone.
        </desc>
        <defs>
          <marker
            id={`${id}-arrow`}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M1 1 L7 4 L1 7" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        <text x={callerX} y="34" className="rcmap-label">
          CALLER SCOPES
        </text>
        <rect
          x={workerX - (compact ? 8 : 16)}
          y="54"
          width={workerWidth + (compact ? 16 : 32)}
          height={compact ? 410 : 382}
          rx="8"
          className="rcmap-map"
        />
        <text x={workerX} y="34" className="rcmap-label">
          RCMAP
        </text>

        {frame.jobs.map((job, index) => {
          const y = 80 + index * 114
          const holding = job.state === "active" || job.state === "acquiring"
          const closed = job.state === "done"
          const targetY = job.mailbox === "alice" ? 160 : 350
          const fromX = callerX + callerWidth - 8
          const fromY = y + 36
          const toX = workerX - 3
          const middle = (fromX + toX) / 2
          return (
            <g
              key={job.id}
              className={`rcmap-caller ${closed ? "rcmap-caller-closed" : ""}`}
            >
              {holding && (
                <path
                  className="rcmap-reference"
                  d={`M${fromX} ${fromY} C${middle} ${fromY} ${middle} ${targetY} ${toX} ${targetY}`}
                  markerEnd={`url(#${id}-arrow)`}
                />
              )}
              <g transform={`translate(${callerX} ${y})`}>
                <text y="12" className="rcmap-scope-title">
                  Recruiter {job.id}
                </text>
                <rect
                  y="24"
                  width="124"
                  height="26"
                  rx="13"
                  className={`rcmap-scope-status ${holding ? "rcmap-scope-status-open" : ""}`}
                />
                <text x="62" y="42" textAnchor="middle" className="rcmap-small">
                  {closed
                    ? "Closed"
                    : holding
                      ? "Scope open"
                      : job.state === "requesting"
                        ? "Acquiring"
                        : "Waiting"}
                </text>
                <circle
                  cx={callerWidth - 8}
                  cy="36"
                  r="5"
                  className={holding ? "rcmap-owned-dot" : "rcmap-empty-dot"}
                />
                <path d={`M0 70 H${callerWidth}`} className="rcmap-divider" />
              </g>
            </g>
          )
        })}

        {frame.workers.map((worker, index) =>
          worker.state !== "missing" && worker.state !== "closed" ? (
            <g
              key={worker.mailbox}
              transform={`translate(${workerX} ${index === 0 ? 70 : 274})`}
              className={`rcmap-worker rcmap-worker-${worker.state} ${worker.reused ? "rcmap-worker-reused" : ""}`}
            >
              <g opacity={worker.state === "stopped" ? 0.5 : 1}>
                <text x="0" y="14" className="rcmap-field-label">
                  KEY
                </text>
                <text x="34" y="14" className="rcmap-node-title">
                  {worker.mailbox}
                </text>
                <g transform="translate(0 28)">
                  <rect
                    width={workerWidth}
                    height={compact ? 152 : 124}
                    rx="5"
                    className="rcmap-worker-card"
                  />
                  <text x="16" y="18" className="rcmap-field-label">
                    VALUE
                  </text>
                  <text x="16" y="48" className="rcmap-node-title">
                    Reply worker
                  </text>
                  <text x="16" y="68" className="rcmap-small">
                    Ghostwriter
                  </text>
                  <circle
                    cx="20"
                    cy="92"
                    r="3"
                    className={`rcmap-status rcmap-status-${worker.state}`}
                  />
                  <text x="32" y="96" className="rcmap-small">
                    {worker.state === "starting"
                      ? "Starting"
                      : worker.state === "stopping"
                        ? "Stopping"
                        : worker.state === "stopped"
                          ? "Stopped"
                          : "Running"}
                  </text>
                  <path
                    d={
                      compact
                        ? `M0 116 H${workerWidth}`
                        : `M${workerWidth - 138} 36 V108`
                    }
                    className="rcmap-divider"
                  />
                  <motion.text
                    key={worker.references}
                    x={compact ? 16 : workerWidth - 70}
                    y={compact ? 140 : 74}
                    textAnchor={compact ? "start" : "middle"}
                    className={`rcmap-count ${compact ? "" : "rcmap-count-large"} ${worker.decrementAt !== undefined ? "rcmap-count-changed" : ""}`}
                    initial={{
                      opacity: reducedMotion || !playback.running ? 1 : 0,
                    }}
                    animate={{ opacity: 1 }}
                    transition={transition}
                  >
                    {worker.references}
                  </motion.text>
                  <text
                    x={compact ? 36 : workerWidth - 70}
                    y={compact ? 140 : 98}
                    textAnchor={compact ? "start" : "middle"}
                    className="rcmap-small"
                  >
                    {worker.references === 1 ? "reference" : "references"}
                  </text>
                  {worker.decrementAt !== undefined && (
                    <ReferenceDecrement
                      clock={playback.clock}
                      at={worker.decrementAt}
                      x={workerWidth - (compact ? 30 : 36)}
                      y={compact ? 140 : 48}
                      reducedMotion={reducedMotion}
                    />
                  )}
                </g>
              </g>
            </g>
          ) : null,
        )}
        {!reducedMotion &&
          frame.jobs.map((job, index) => (
            <AnimationPacket
              key={job.id}
              clock={playback.clock}
              start={job.request}
              duration={job.arrival - job.request}
              fromX={callerX + callerWidth}
              fromY={116 + index * 114}
              toX={workerX}
              toY={job.mailbox === "alice" ? 160 : 350}
              label={`get(${job.mailbox})`}
              width={108}
            />
          ))}
      </svg>
      <AnimationControls
        playing={playback.playing}
        onRestart={playback.restart}
        onToggle={playback.toggle}
        onNext={() =>
          playback.seek((mailboxSteps[frame.step + 1] ?? mailboxSteps[0]).at)
        }
      />
    </AnimationFrame>
  )
}
