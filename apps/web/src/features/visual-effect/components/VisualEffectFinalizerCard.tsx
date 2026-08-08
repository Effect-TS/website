import { AlertTriangle, Check, OctagonMinus, Square } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import * as React from "react"
import type { VisualFinalizerEntry } from "@/features/visual-effect/model/domain"

const CARD_WIDTH = 200

export function VisualEffectFinalizerCard({
  finalizer,
}: {
  readonly finalizer: VisualFinalizerEntry
}) {
  const isRunning = finalizer.phase === "Running"
  const isPending = finalizer.phase === "Pending"
  const isSucceeded = finalizer.phase === "Succeeded"
  const isFailed = finalizer.phase === "Failed"
  const isInterrupted = finalizer.phase === "Interrupted"
  const [justCompleted, setJustCompleted] = React.useState(false)
  const previousPhaseRef = React.useRef(finalizer.phase)

  React.useEffect(() => {
    const previousPhase = previousPhaseRef.current

    let timeout: NodeJS.Timeout

    if (
      previousPhase !== finalizer.phase &&
      (isSucceeded || isFailed || isInterrupted)
    ) {
      setJustCompleted(true)
      timeout = globalThis.setTimeout(() => setJustCompleted(false), 600)
      previousPhaseRef.current = finalizer.phase
    }

    previousPhaseRef.current = finalizer.phase

    return () => {
      if (timeout) {
        globalThis.clearTimeout(timeout)
      }
    }
  }, [finalizer.phase, isFailed, isInterrupted, isSucceeded])

  const cardClassName = isPending
    ? "border-neutral-700 bg-neutral-800"
    : isRunning
      ? "border-blue-500 bg-blue-950"
      : isSucceeded
        ? "border-emerald-500 bg-emerald-950"
        : isInterrupted
          ? "border-amber-500 bg-amber-950"
          : "border-red-500 bg-red-950"

  const iconClassName = isPending
    ? "border-neutral-500 bg-neutral-700 text-neutral-200"
    : isRunning
      ? "border-blue-500 bg-blue-900 text-blue-200"
      : isSucceeded
        ? "border-emerald-500 bg-emerald-500 text-white"
        : isInterrupted
          ? "border-amber-500 bg-amber-700 text-white"
          : "border-red-500 bg-red-700 text-white"

  const labelClassName = isPending
    ? "text-white"
    : isRunning
      ? "text-blue-200"
      : isSucceeded
        ? "text-emerald-200"
        : isInterrupted
          ? "text-amber-100"
          : "text-red-200"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.12, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
      transition={{ type: "spring", visualDuration: 0.3, bounce: 0.25 }}
      className={`relative flex h-[52px] items-center gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/40 ${cardClassName}`}
      style={{
        minWidth: CARD_WIDTH,
        willChange: "transform, opacity, filter",
        translateZ: 0,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", visualDuration: 0.28, bounce: 0.28 }}
        className={`relative flex size-6 items-center justify-center rounded border ${iconClassName}`}
      >
        {isPending && <Square className="size-3.5" />}
        {isRunning && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%)",
            }}
          />
        )}
        {isRunning && (
          <Square className="relative z-10 size-3.5 fill-current" />
        )}
        {isSucceeded && <Check className="size-3.5" strokeWidth={3} />}
        {isInterrupted && <OctagonMinus className="size-3.5" />}
        {isFailed && <AlertTriangle className="size-3.5" />}
      </motion.div>

      {isRunning && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          animate={{ opacity: [0, 0.25, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.18) 0%, transparent 70%)",
          }}
        />
      )}

      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0.75, scale: 1 }}
            animate={{ opacity: 0, scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-lg"
            style={{
              background: isSucceeded
                ? "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.3) 0%, transparent 70%)"
                : isInterrupted
                  ? "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.3) 0%, transparent 70%)"
                  : "radial-gradient(ellipse at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 min-w-0">
        <span
          className={`block truncate font-mono text-base font-medium ${labelClassName}`}
        >
          {finalizer.label}
        </span>
      </div>
    </motion.div>
  )
}

export const FINALIZER_CARD_WIDTH = CARD_WIDTH
