import { useAtomValue } from "@effect/atom-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { CircleCheck, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { isLoadedAtom } from "../atoms/loader"
import { loaderStepsAtom } from "../services/loader"

export function PlaygroundLoader() {
  const reducedMotion = useReducedMotion()
  const isReady = useAtomValue(isLoadedAtom)
  const [isVisible, setIsVisible] = useState(true)
  const steps = useAtomValue(loaderStepsAtom, (steps) => {
    return steps.every((step) => step.done)
      ? steps
      : steps.slice(0, steps.findIndex((step) => !step.done) + 1)
  })

  // Keep the overlay mounted for the commit where `isReady` first becomes true.
  // The final loader steps can be added and completed in the same React batch;
  // hiding from render immediately would skip painting those completed steps.
  useEffect(() => {
    if (isReady) {
      setIsVisible(false)
    }
  }, [isReady])

  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.5 }}
          role="status"
          aria-label="Loading Playground"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4"
        >
          <div className="w-full max-w-sm rounded-md border border-border bg-card p-6">
            <p className="font-mono text-sm font-medium tracking-wider text-foreground uppercase">
              Loading Playground
            </p>
            <div className="mt-4 mb-5 h-px bg-border" />
            <div className="flex flex-col space-y-3">
              <AnimatePresence initial={false}>
                {steps.map((step) => (
                  <motion.div
                    key={step.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.3,
                      ease: "easeInOut",
                    }}
                    className="flex w-full items-center space-x-2.5"
                  >
                    {step.done ? (
                      <CircleCheck
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-success-foreground"
                      />
                    ) : (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
                      />
                    )}
                    <span
                      className={`font-mono text-[13px] ${
                        step.done ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {step.message}
                      <span className="sr-only">
                        {step.done ? ": complete" : ": in progress"}
                      </span>
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
