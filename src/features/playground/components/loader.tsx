import { useAtomValue } from "@effect/atom-react"
import { motion, AnimatePresence } from "framer-motion"
import { CircleCheck, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { isLoadedAtom } from "../atoms/loader"
import { loaderStepsAtom } from "../services/loader"

export function PlaygroundLoader() {
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
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"
        >
          <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-mono text-sm font-medium tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
              Loading Playground
            </p>
            <div className="mt-4 mb-5 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col space-y-3">
              <AnimatePresence initial={false}>
                {steps.map((step) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex w-full items-center space-x-2.5"
                  >
                    {step.done ? (
                      <CircleCheck className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400 dark:text-zinc-500" />
                    )}
                    <span
                      className={`font-mono text-[13px] ${
                        step.done
                          ? "text-zinc-500 dark:text-zinc-400"
                          : "text-zinc-900 dark:text-white"
                      }`}
                    >
                      {step.message}
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
