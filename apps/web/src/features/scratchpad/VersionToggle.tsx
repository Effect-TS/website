import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as React from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { EffectVersion } from "@/features/share/workspace"
import { DOCS_VERSIONS } from "@/lib/versions"
import { useScratchpadSession } from "./context.tsx"

/**
 * Picks the Effect version. Switching asks first, then resets the Scratchpad
 * to that version's seed.
 */
export function VersionToggle() {
  const { effectVersionAtom, resetAtom } = useScratchpadSession()
  const current = useAtomValue(effectVersionAtom)
  const reset = useAtomSet(resetAtom)
  const [pending, setPending] = React.useState<EffectVersion | null>(null)

  return (
    <>
      <fieldset
        data-testid="scratchpad-version-toggle"
        className="inline-flex shrink-0 gap-0.5 rounded border border-zinc-300 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <legend className="sr-only">Effect version</legend>
        {DOCS_VERSIONS.map(({ value, label }) => {
          const active = value === current
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              title={`Effect ${label}`}
              onClick={() => {
                if (!active) setPending(value)
              }}
              className={`h-7 cursor-pointer rounded-sm px-2.5 font-mono text-sm leading-none ${
                active
                  ? "bg-white font-semibold text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          )
        })}
      </fieldset>
      <ConfirmDialog
        open={pending !== null}
        title={`Switch to Effect ${pending ?? ""}?`}
        description="This discards your code and loads the starter Scratchpad for that version. It can't be undone."
        confirmLabel="Switch"
        onConfirm={() => {
          if (pending !== null) reset(pending)
        }}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      />
    </>
  )
}
