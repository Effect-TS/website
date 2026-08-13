import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useState } from "react"
import { DOCS_VERSIONS } from "@/lib/versions"
import { switchVersionAtom } from "../atoms/import"
import { useWorkspaceAtom } from "../context/workspace"
import type { EffectVersion } from "../domain/workspace"
import { ConfirmDialog } from "./confirm-dialog"

export function VersionToggle() {
  const currentVersion = useAtomValue(
    useWorkspaceAtom(),
    (workspace) => workspace.effectVersion,
  )
  const switchVersion = useAtomSet(switchVersionAtom)
  const [pendingVersion, setPendingVersion] = useState<EffectVersion | null>(
    null,
  )

  return (
    <>
      <fieldset className="inline-flex shrink-0 gap-1 rounded-md border border-zinc-300 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
        <legend className="sr-only">Effect version for this playground</legend>
        {DOCS_VERSIONS.map(({ value, label }) => {
          const active = value === currentVersion
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              title="Effect version for this playground"
              onClick={() => {
                if (!active) setPendingVersion(value)
              }}
              className={`cursor-pointer rounded-sm px-3 py-1 text-center font-mono text-xs leading-4 transition-all duration-200 ${
                active
                  ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          )
        })}
      </fieldset>
      {pendingVersion !== null && (
        <ConfirmDialog
          open
          title={`Switch to Effect ${pendingVersion}?`}
          description="This will discard your current code and load the default example for the selected version. This action can't be undone."
          confirmLabel="Switch"
          onConfirm={() => switchVersion(pendingVersion)}
          onClose={() => setPendingVersion(null)}
        />
      )}
    </>
  )
}
