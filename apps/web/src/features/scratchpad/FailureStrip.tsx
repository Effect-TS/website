import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Option from "effect/Option"
import {
  CircleX,
  ExternalLink,
  Globe,
  PackageX,
  RotateCcw,
  X,
} from "lucide-react"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import type { ContainerFailure, ContainerFailureKind } from "./failure.ts"

export interface FailureState extends ContainerFailure {
  /** False after the visitor hid the strip; the status badge shows it again. */
  readonly visible: boolean
  /** Re-runs the failed phase (a no-op when `canRetry` is false). */
  readonly retry: () => void
  readonly dismiss: () => void
  readonly show: () => void
}

/**
 * The Container failure the Scratchpad shows, or `None`. "Dependencies
 * unavailable" is not a failure: read `dependenciesUnavailableLineAtom` for
 * its output line instead.
 */
export function useFailureState(): Option.Option<FailureState> {
  const { failureAtom, visibleFailureAtom, dismissedFailureAtom, retryAtom } =
    useScratchpadSession()
  const failure = useAtomValue(failureAtom)
  const visible = useAtomValue(visibleFailureAtom)
  const setDismissed = useAtomSet(dismissedFailureAtom)
  const retry = useAtomSet(retryAtom)
  return React.useMemo(
    () =>
      Option.map(failure, (failure) => ({
        ...failure,
        visible: Option.isSome(visible),
        retry: () => retry(undefined),
        dismiss: () => setDismissed(Option.some(failure.error)),
        show: () => setDismissed(Option.none()),
      })),
    [failure, visible, retry, setDismissed],
  )
}

const ICONS: Record<
  ContainerFailureKind,
  React.ComponentType<{ className?: string }>
> = {
  unsupported: Globe,
  "boot-failed": CircleX,
  "install-failed": PackageX,
}

/**
 * Variant B2 from ticket 03: a full-width strip that covers nothing. It
 * belongs at the top of the Output panel; for an install failure the
 * terminal below it has pnpm's output, as for every install.
 */
export function FailureStrip() {
  const state = useFailureState()
  if (Option.isNone(state) || !state.value.visible) return null
  const failure = state.value
  const Icon = ICONS[failure.kind]

  return (
    <div
      role="alert"
      data-testid="container-failure"
      data-failure-kind={failure.kind}
      title={failure.detail}
      className="flex shrink-0 items-start gap-3 border-b border-rose-500/30 bg-rose-50 px-4 py-2.5 dark:bg-rose-950/30"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          {failure.title}.
        </span>{" "}
        <span className="text-zinc-600 dark:text-zinc-400">
          {failure.message}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        {failure.canRetry && (
          <button
            type="button"
            data-testid="container-failure-retry"
            onClick={failure.retry}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <RotateCcw className="h-3 w-3" />
            {failure.retryLabel}
          </button>
        )}
        {failure.helpUrl !== undefined && (
          <a
            href={failure.helpUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            {failure.helpLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button
          type="button"
          aria-label="Hide"
          title="Hide (the status badge brings it back)"
          onClick={failure.dismiss}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
