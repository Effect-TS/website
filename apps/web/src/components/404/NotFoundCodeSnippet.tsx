import { motion } from "motion/react"

const CODE_LINES = [
  // Line 0: import { Effect } from "effect"
  <>
    <span className="text-violet-600 dark:text-violet-400">import</span>
    <span className="text-zinc-500 dark:text-zinc-400">{" { "}</span>
    <span className="text-zinc-900 dark:text-white">Effect</span>
    <span className="text-zinc-500 dark:text-zinc-400">{" } "}</span>
    <span className="text-violet-600 dark:text-violet-400">from</span>
    <span className="text-emerald-600 dark:text-emerald-400">
      {' "effect"'}
    </span>
  </>,
  // Line 1: (empty line)
  null,
  // Line 2: const page = Effect.fail("404: Not Found").pipe(
  <>
    <span className="text-violet-600 dark:text-violet-400">const</span>
    <span className="text-zinc-700 dark:text-zinc-300"> page</span>
    <span className="text-zinc-500 dark:text-zinc-400">{" = "}</span>
    <span className="text-zinc-900 dark:text-white">Effect</span>
    <span className="text-zinc-500 dark:text-zinc-400">.</span>
    <span className="text-zinc-700 dark:text-zinc-300">fail</span>
    <span className="text-zinc-500 dark:text-zinc-400">{"("}</span>
    <span className="text-emerald-600 dark:text-emerald-400">
      {'"404: Not Found"'}
    </span>
    <span className="text-zinc-500 dark:text-zinc-400">{")."}</span>
    <span className="text-zinc-700 dark:text-zinc-300">pipe</span>
    <span className="text-zinc-500 dark:text-zinc-400">{"("}</span>
  </>,
  // Line 3:   Effect.catchAll(() => Effect.succeed("/"))
  <>
    <span className="text-zinc-500 dark:text-zinc-400">{"  "}</span>
    <span className="text-zinc-900 dark:text-white">Effect</span>
    <span className="text-zinc-500 dark:text-zinc-400">.</span>
    <span className="text-zinc-700 dark:text-zinc-300">catchAll</span>
    <span className="text-zinc-500 dark:text-zinc-400">{"(() => "}</span>
    <span className="text-zinc-900 dark:text-white">Effect</span>
    <span className="text-zinc-500 dark:text-zinc-400">.</span>
    <span className="text-zinc-700 dark:text-zinc-300">succeed</span>
    <span className="text-zinc-500 dark:text-zinc-400">{"("}</span>
    <span className="text-emerald-600 dark:text-emerald-400">{'"/"'}</span>
    <span className="text-zinc-500 dark:text-zinc-400">{"))"}</span>
  </>,
  // Line 4: )
  <>
    <span className="text-zinc-500 dark:text-zinc-400">{")"}</span>
  </>,
]

export function NotFoundCodeSnippet() {
  return (
    <div className="w-full max-w-2xl">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-700">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#ff5f57" }}
          />
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#febc2e" }}
          />
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#28c840" }}
          />
          <span className="ml-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">
            not-found.ts
          </span>
        </div>
        <pre className="px-4 py-2 font-mono text-sm leading-loose sm:px-5 sm:text-base md:py-4">
          {CODE_LINES.map((line, i) => (
            <motion.div
              key={`code-line-${i.toString()}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: 0.3 + i * 0.08,
                ease: "easeOut",
              }}
              className="leading-relaxed"
            >
              {line ?? "\u00A0"}
            </motion.div>
          ))}
        </pre>
      </div>
    </div>
  )
}
