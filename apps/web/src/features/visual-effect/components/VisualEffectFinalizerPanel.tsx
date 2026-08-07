import { ChevronRight } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useContainerWidth } from "@/features/visual-effect/hooks/useContainerWidth"
import {
  FINALIZER_CARD_WIDTH,
  VisualEffectFinalizerCard,
} from "./VisualEffectFinalizerCard"
import { useFinalizerPanel } from "./VisualEffectProvider"

export function VisualEffectFinalizerPanel() {
  const panel = useFinalizerPanel()
  const { containerRef, containerWidth } = useContainerWidth()

  const pendingFinalizers = panel.finalizers.filter(
    (finalizer) => finalizer.phase === "Pending",
  )
  const completedFinalizers = panel.finalizers.filter(
    (finalizer) =>
      finalizer.phase === "Succeeded" ||
      finalizer.phase === "Failed" ||
      finalizer.phase === "Interrupted",
  )

  return (
    <section className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-4">
      <div
        ref={containerRef}
        className="relative h-[88px] overflow-hidden rounded-xl border border-dashed border-neutral-700/80"
      >
        <div className="absolute inset-0 flex items-center justify-center text-neutral-700">
          <div className="flex items-center gap-2 font-mono text-sm tracking-[0.28em]">
            <AnimatedChevronRow />
            <span>FINALIZERS</span>
            <AnimatedChevronRow />
          </div>
        </div>

        {containerWidth > 0 && (
          <AnimatePresence mode="popLayout">
            {panel.finalizers.map((finalizer) => {
              const isPending = finalizer.phase === "Pending"
              const isRunning = finalizer.phase === "Running"
              const pendingIndex = pendingFinalizers.findIndex(
                (entry) => entry.id === finalizer.id,
              )
              const completedIndex = completedFinalizers.findIndex(
                (entry) => entry.id === finalizer.id,
              )

              let x = 16
              let zIndex = 10

              if (isRunning) {
                x = (containerWidth - FINALIZER_CARD_WIDTH) / 2
                zIndex = 20
              } else if (isPending) {
                x = pendingIndex * 35 + 16
                zIndex = 10 + pendingIndex
              } else {
                const rightOffset =
                  (completedFinalizers.length - 1 - completedIndex) * 35 + 16
                x = containerWidth - rightOffset - FINALIZER_CARD_WIDTH
                zIndex = 10 - completedIndex
              }

              return (
                <motion.div
                  key={finalizer.id}
                  layoutId={finalizer.id}
                  className="absolute top-[18px]"
                  style={{ zIndex, willChange: "transform", translateZ: 0 }}
                  animate={{ x, scale: isRunning ? 1.05 : 1 }}
                  transition={{
                    type: "spring",
                    visualDuration: 0.5,
                    bounce: 0,
                  }}
                >
                  <VisualEffectFinalizerCard finalizer={finalizer} />
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  )
}

function AnimatedChevronRow() {
  return (
    <div className="flex gap-1 text-neutral-600">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        >
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </motion.span>
      ))}
    </div>
  )
}
