import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useScratchpadSession } from "./context.tsx"
import { useFailureState } from "./FailureStrip.tsx"
import * as Option from "effect/Option"
import {
  describeContainerPhase,
  describeLspStatus,
  type LspStatusTone,
} from "./status.ts"

const DOT_STYLES: Record<LspStatusTone, string> = {
  neutral: "bg-zinc-400 dark:bg-zinc-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
}

const BADGE_STYLES: Record<LspStatusTone, string> = {
  neutral:
    "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

export function StatusIndicator() {
  const { statusAtom, reconnectAtom } = useScratchpadSession()
  const status = useAtomValue(statusAtom)
  const reconnect = useAtomSet(reconnectAtom)

  const view = describeLspStatus(status)
  const isPulsing =
    view.state === "connecting" ||
    view.state === "loading" ||
    view.state === "reconnecting"

  const dot = (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[view.tone]} ${isPulsing ? "animate-pulse" : ""}`}
    />
  )

  const baseClasses = `inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-xs leading-none transition-colors ${BADGE_STYLES[view.tone]}`

  if (view.interactive) {
    return (
      <button
        type="button"
        data-testid="lsp-status"
        data-lsp-status={view.state}
        title={view.detail}
        aria-label={`${view.label}. ${view.actionLabel ?? ""}`.trim()}
        onClick={() => reconnect()}
        className={`${baseClasses} cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:brightness-110`}
      >
        {dot}
        <span>{view.label}</span>
      </button>
    )
  }

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="lsp-status"
      data-lsp-status={view.state}
      title={view.detail}
      className={baseClasses}
    >
      {dot}
      <span>{view.label}</span>
    </span>
  )
}

/**
 * The Container's phase, next to the language server's. Hidden without a
 * Container. During a failure it is a button that shows the failure strip
 * again after it was hidden.
 */
export function ContainerStatusIndicator() {
  const { containerPhaseAtom } = useScratchpadSession()
  const phase = useAtomValue(containerPhaseAtom)
  const failure = useFailureState()
  if (Option.isNone(phase)) return null

  const view = describeContainerPhase(phase.value)
  const className = `inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-xs leading-none transition-colors ${BADGE_STYLES[view.tone]}`
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[view.tone]} ${view.busy ? "animate-pulse" : ""}`}
      />
      <span>{view.label}</span>
    </>
  )

  if (Option.isSome(failure)) {
    return (
      <button
        type="button"
        data-testid="container-status"
        data-container-phase={view.state}
        title={view.detail}
        aria-label={`${view.label}. Show details`}
        onClick={failure.value.show}
        className={`${className} cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:brightness-110`}
      >
        {content}
      </button>
    )
  }

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="container-status"
      data-container-phase={view.state}
      title={view.detail}
      className={className}
    >
      {content}
    </span>
  )
}
