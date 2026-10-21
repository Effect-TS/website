import { RegistryProvider, useAtomValue } from "@effect/atom-react"
import {
  coveredAtom,
  moduleIndexAtom,
  statusAtom,
} from "@/features/motw-vote/atoms"
import type { ModuleRef } from "@/features/motw-vote/domain"
import { cn } from "@/lib/utils"
import { ModuleSearch } from "./ModuleSearch"
import { Suggestions } from "./Suggestions"

/**
 * "What should we cover next?": people search the module list and +1 the ones
 * they want covered. The ranking's order is fixed for the visit (sorted on
 * load and when a module joins), so a row never moves away from the pointer.
 */
export function MotwVote({
  moduleIndex,
  covered = [],
}: {
  readonly moduleIndex: ReadonlyArray<ModuleRef>
  /** Ids of modules the series already covered: shown in search, not votable. */
  readonly covered?: ReadonlyArray<string>
}) {
  return (
    <RegistryProvider
      initialValues={[
        [moduleIndexAtom, moduleIndex],
        [coveredAtom, covered],
      ]}
    >
      <Section />
    </RegistryProvider>
  )
}

function Section() {
  const status = useAtomValue(statusAtom)
  return (
    <section
      id="vote"
      aria-labelledby="requests-title"
      className="scroll-mt-16"
    >
      <div className="mx-auto w-full max-w-295 px-4 py-24 md:pt-40">
        <div className="lg:w-1/2 lg:pr-4">
          <p className="mb-3 font-mono text-sm font-medium tracking-wider text-muted-foreground uppercase">
            {"// Vote for the next module"}
          </p>
          <h2
            id="requests-title"
            className="text-2xl leading-tighter font-bold text-foreground md:text-3xl"
          >
            What should we cover next?
          </h2>
          <ModuleSearch />
        </div>
        <Suggestions />
        <p
          id="module-suggestion-message"
          aria-live="polite"
          className={cn(
            "text-sm",
            status
              ? cn(
                  "mt-3",
                  status.tone === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )
              : "sr-only",
          )}
        >
          {status?.text}
        </p>
      </div>
    </section>
  )
}
