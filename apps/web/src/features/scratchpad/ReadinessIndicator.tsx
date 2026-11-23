import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Popover } from "@base-ui/react/popover"
import * as Option from "effect/Option"
import {
  Circle,
  CircleCheck,
  CircleDashed,
  CirclePlay,
  CircleX,
  ExternalLink,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"
import { useScratchpadSession } from "./context.tsx"
import { BROWSER_SUPPORT_URL } from "./failure.ts"
import { useFailureState } from "./FailureStrip.tsx"
import {
  describeContainerStatus,
  describeLspStatus,
  describeReadiness,
  type ReadinessAction,
  type ReadinessIcon,
  type ReadinessStepState,
} from "./status.ts"

const ICON_COLOR: Record<ReadinessIcon, string> = {
  error: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  busy: "text-sky-600 dark:text-sky-400",
  running: "text-blue-600 dark:text-blue-400",
  ready: "text-emerald-600 dark:text-emerald-400",
}

const ICON_LABEL: Record<ReadinessIcon, string> = {
  error: "Error",
  warning: "Warning",
  busy: "Getting ready",
  running: "Running",
  ready: "Ready",
}

function StateIcon({
  icon,
  className,
}: {
  readonly icon: ReadinessIcon
  readonly className: string
}) {
  switch (icon) {
    case "error":
      return <CircleX aria-hidden="true" className={className} />
    case "warning":
      return <TriangleAlert aria-hidden="true" className={className} />
    case "busy":
      return (
        <LoaderCircle
          aria-hidden="true"
          className={`${className} animate-spin`}
        />
      )
    case "running":
      return (
        <CirclePlay
          aria-hidden="true"
          className={`${className} animate-pulse`}
        />
      )
    case "ready":
      return <CircleCheck aria-hidden="true" className={className} />
  }
}

const STEP_COLOR: Record<ReadinessStepState, string> = {
  done: "text-emerald-600 dark:text-emerald-400",
  busy: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-rose-600 dark:text-rose-400",
  pending: "text-zinc-400 dark:text-zinc-600",
  skipped: "text-zinc-400 dark:text-zinc-600",
}

function StepIcon({ state }: { readonly state: ReadinessStepState }) {
  const className = `mt-[3px] h-3.5 w-3.5 shrink-0 ${STEP_COLOR[state]}`
  switch (state) {
    case "done":
      return <CircleCheck aria-hidden="true" className={className} />
    case "busy":
      return (
        <LoaderCircle
          aria-hidden="true"
          className={`${className} animate-spin`}
        />
      )
    case "warning":
      return <TriangleAlert aria-hidden="true" className={className} />
    case "error":
      return <CircleX aria-hidden="true" className={className} />
    case "pending":
      return <Circle aria-hidden="true" className={className} />
    case "skipped":
      return <CircleDashed aria-hidden="true" className={className} />
  }
}

const STEP_TEXT: Record<ReadinessStepState, string> = {
  done: "text-zinc-700 dark:text-zinc-300",
  busy: "text-zinc-900 dark:text-zinc-100",
  warning: "font-medium text-zinc-900 dark:text-zinc-50",
  error: "font-medium text-zinc-900 dark:text-zinc-50",
  pending: "text-zinc-400 dark:text-zinc-500",
  skipped: "text-zinc-400 dark:text-zinc-500",
}

const PRIMARY_BUTTON =
  "cursor-pointer rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
const LINK_BUTTON =
  "inline-flex cursor-pointer items-center gap-1 text-xs text-sky-700 hover:underline dark:text-sky-300"

/**
 * One icon for the language server and the Container, worst state first.
 * Hovering, focusing or clicking it opens a popover with a checklist of the
 * startup steps and, on a failure, what still works and how to recover. The
 * popover stays open while the pointer is over it, so its buttons work.
 */
export function ReadinessIndicator() {
  const { statusAtom, reconnectAtom, containerPhaseAtom, runStateAtom } =
    useScratchpadSession()
  const lsp = useAtomValue(statusAtom)
  const phase = useAtomValue(containerPhaseAtom)
  const runs = useAtomValue(runStateAtom)
  const reconnect = useAtomSet(reconnectAtom)
  const failure = useFailureState()

  const runAlive = runs.run?.status._tag === "running"
  const containerPhase = Option.getOrUndefined(phase)
  const view = describeReadiness(lsp, containerPhase, runAlive)
  const lspView = describeLspStatus(lsp)
  const containerView =
    containerPhase === undefined
      ? undefined
      : describeContainerStatus(containerPhase, runAlive)

  const act = (action: ReadinessAction) => {
    switch (action._tag) {
      case "RetryContainer":
        Option.map(failure, (failure) => failure.retry())
        return
      case "ShowFailure":
        Option.map(failure, (failure) => failure.show())
        return
      case "RestartLsp":
        reconnect()
        return
      case "BrowserSupport":
        return
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        closeDelay={200}
        data-testid="readiness-indicator"
        data-readiness={view.icon}
        aria-label={`${ICON_LABEL[view.icon]}: ${view.title}. Show details`}
        // During a Container failure, clicking also brings back a hidden
        // failure strip.
        onClick={() => Option.map(failure, (failure) => failure.show())}
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md hover:bg-zinc-200/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 data-[popup-open]:bg-zinc-200/70 dark:hover:bg-zinc-800 dark:data-[popup-open]:bg-zinc-800"
      >
        <StateIcon
          icon={view.icon}
          className={`h-[18px] w-[18px] ${ICON_COLOR[view.icon]}`}
        />
        {/* Screen-reader status (announced on change) and the hooks e2e
            tests read: one per subsystem. */}
        <span
          role="status"
          aria-live="polite"
          data-testid="lsp-status"
          data-lsp-status={lspView.state}
          title={lspView.detail}
          className="sr-only"
        >
          Language server: {lspView.label}
        </span>
        {containerView !== undefined && (
          <span
            role="status"
            aria-live="polite"
            data-testid="container-status"
            data-container-phase={containerView.state}
            data-run-state={containerView.running ? "running" : "idle"}
            title={containerView.detail}
            className="sr-only"
          >
            Container: {containerView.label}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6}>
          <Popover.Popup
            data-testid="readiness-popover"
            className="z-50 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-[13px] leading-normal text-zinc-700 shadow-lg outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-black/50"
          >
            <Popover.Title className="mb-1.5 text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
              {view.title}
            </Popover.Title>
            <ul className="space-y-0.5">
              {view.steps.map((step) => (
                <li
                  key={step.label}
                  data-step-state={step.state}
                  className="flex gap-2"
                >
                  <StepIcon state={step.state} />
                  <span className={STEP_TEXT[step.state]}>
                    {step.label}
                    {step.detail !== undefined && (
                      <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {step.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {view.message !== undefined && (
              <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {view.message}
              </p>
            )}
            {view.actions.length > 0 && (
              <div className="mt-2.5 flex items-center gap-3">
                {view.actions.map((action) =>
                  action._tag === "BrowserSupport" ? (
                    <a
                      key={action._tag}
                      href={BROWSER_SUPPORT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_BUTTON}
                    >
                      Supported browsers
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  ) : action._tag === "ShowFailure" ? (
                    <button
                      key={action._tag}
                      type="button"
                      onClick={() => act(action)}
                      className={LINK_BUTTON}
                    >
                      Show details
                    </button>
                  ) : (
                    <button
                      key={action._tag}
                      type="button"
                      data-testid="readiness-action"
                      onClick={() => act(action)}
                      className={PRIMARY_BUTTON}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
