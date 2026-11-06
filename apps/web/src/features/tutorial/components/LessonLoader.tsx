import { AnimatePresence, motion } from "framer-motion"
import { CircleCheck, Loader2 } from "lucide-react"

export const BOOT_STEPS = [
  "Loading the editor",
  "Loading the Effect types",
  "Checking your code",
] as const

/** Same card as the playground loader. */
export function LoaderCard({ done }: { readonly done: number }) {
  const visible = BOOT_STEPS.slice(0, Math.min(done + 1, BOOT_STEPS.length))
  return (
    <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="font-mono text-sm font-medium tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
        Loading lesson
      </p>
      <div className="mt-4 mb-5 h-px bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col space-y-3">
        {visible.map((message, index) => (
          <div key={message} className="flex w-full items-center space-x-2.5">
            {index < done ? (
              <CircleCheck className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400 dark:text-zinc-500" />
            )}
            <span
              className={`font-mono text-[13px] ${
                index < done
                  ? "text-zinc-500 dark:text-zinc-400"
                  : "text-zinc-900 dark:text-white"
              }`}
            >
              {message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Covers the work area until the editor and the first check are ready. */
export function LessonLoader({ done }: { readonly done: number }) {
  return (
    <AnimatePresence initial={false}>
      {done < BOOT_STEPS.length && (
        <motion.div
          data-testid="tutorial-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950"
        >
          <LoaderCard done={done} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
