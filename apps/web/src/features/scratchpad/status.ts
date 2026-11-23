import type { ContainerPhase } from "./container.ts"
import type { LspErrorCode, LspStatus } from "./session.ts"

export interface LspStatusView {
  readonly state: LspStatus["_tag"]
  readonly label: string
  readonly detail: string
}

const errorSummary = (code: LspErrorCode, retryable: boolean): string => {
  switch (code) {
    case "unreachable":
      return retryable ? "Disconnected · Retry" : "Disconnected"
    case "crashed":
      return retryable ? "Stopped · Restart" : "Stopped"
  }
}

const formatMiB = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const fileNameOfUri = (uri: string): string => {
  const last = uri.slice(uri.lastIndexOf("/") + 1)
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

export const describeLspStatus = (status: LspStatus): LspStatusView => {
  switch (status._tag) {
    case "connecting":
      return {
        state: "connecting",
        label: "Connecting…",
        detail: "Connecting to the Effect TypeScript language server.",
      }
    case "loading": {
      const percent =
        status.totalBytes > 0
          ? Math.min(
              100,
              Math.floor((status.loadedBytes / status.totalBytes) * 100),
            )
          : undefined
      switch (status.phase) {
        case "downloading":
          return {
            state: "loading",
            label:
              percent === undefined
                ? "Downloading…"
                : `Downloading ${percent}%…`,
            detail:
              status.totalBytes > 0
                ? `Downloading the in-browser Effect TypeScript language server (${formatMiB(status.loadedBytes)} of ${formatMiB(status.totalBytes)}).`
                : "Downloading the in-browser Effect TypeScript language server.",
          }
        case "compiling":
          return {
            state: "loading",
            label: "Compiling…",
            detail:
              "Compiling the in-browser Effect TypeScript language server.",
          }
        case "starting":
          return {
            state: "loading",
            label: "Starting…",
            detail:
              "Starting the in-browser Effect TypeScript language server.",
          }
      }
    }
    case "recovered": {
      const quarantined = status.recovery.quarantined.map(fileNameOfUri)
      return {
        state: "recovered",
        label: "Ready · Restarted",
        detail:
          `The language server crashed (${status.recovery.reason}) and restarted in ${Math.round(status.recovery.ms)} ms.` +
          (quarantined.length > 0
            ? ` Language features are paused for ${quarantined.join(", ")} until its next edit.`
            : ""),
      }
    }
    case "ready":
      return {
        state: "ready",
        label: "Ready",
        detail: "Effect TypeScript language server is connected and ready.",
      }
    case "reconnecting":
      return {
        state: "reconnecting",
        label: `Reconnecting (${status.attempt}/${status.maxAttempts})…`,
        detail: `Reconnecting to the language server (attempt ${status.attempt} of ${status.maxAttempts}).`,
      }
    case "error": {
      return {
        state: "error",
        label: errorSummary(status.code, status.retryable),
        detail: status.message,
      }
    }
  }
}

export interface ContainerStatusView {
  readonly state: ContainerPhase["_tag"]
  readonly label: string
  readonly detail: string
}

const describeContainerPhase = (phase: ContainerPhase): ContainerStatusView => {
  switch (phase._tag) {
    case "booting":
      return {
        state: "booting",
        label: "Booting…",
        detail:
          "Starting the in-browser Node.js container that runs your code.",
      }
    case "installing":
      return {
        state: "installing",
        label: "Installing…",
        detail: "Installing dependencies with pnpm in the container.",
      }
    case "loading-types":
      return {
        state: "loading-types",
        label: "Loading types…",
        detail:
          "Copying the installed packages' types into the language server.",
      }
    case "ready":
      return {
        state: "ready",
        label: "Container ready",
        detail:
          "Dependencies are installed and the editor type-checks against them.",
      }
    case "failed":
      return {
        state: "failed",
        label:
          phase.error._tag === "ContainerUnsupported"
            ? "Can't run here"
            : "Container failed",
        detail: `${phase.error.message} Editing still works.`,
      }
    case "install-failed":
      return {
        state: "install-failed",
        label: "Install failed",
        detail: `${phase.error.message} Editing still works.`,
      }
    case "dependencies-unavailable":
      return {
        state: "dependencies-unavailable",
        label: "Dependencies unavailable",
        detail: `${phase.reason} Code still runs.`,
      }
  }
}

export interface ContainerStatusWithRunView extends ContainerStatusView {
  /** A Run's process is alive. */
  readonly running: boolean
}

/**
 * The Container badge: its phase, or "Running" while a Run's process is
 * alive in a phase that can run code. `state` stays the phase.
 */
export const describeContainerStatus = (
  phase: ContainerPhase,
  runAlive: boolean,
): ContainerStatusWithRunView => {
  const view = describeContainerPhase(phase)
  const running =
    runAlive &&
    (phase._tag === "ready" || phase._tag === "dependencies-unavailable")
  if (!running) return { ...view, running }
  return {
    ...view,
    running,
    label: "Running",
    detail:
      phase._tag === "ready"
        ? "Your program is running in the container."
        : `Your program is running in the container. ${view.detail}`,
  }
}

// ---------------------------------------------------------------------------
// Readiness: one indicator for the language server and the Container
// ---------------------------------------------------------------------------

/** The indicator's icon, worst state first. */
export type ReadinessIcon = "error" | "warning" | "busy" | "running" | "ready"

export type ReadinessStepState =
  | "done"
  | "busy"
  | "warning"
  | "error"
  | "pending"
  | "skipped"

export interface ReadinessStep {
  readonly label: string
  readonly state: ReadinessStepState
  /** One line under the label: progress, or what went wrong. */
  readonly detail?: string | undefined
}

export type ReadinessAction =
  | { readonly _tag: "RetryContainer"; readonly label: string }
  | { readonly _tag: "ShowFailure" }
  | { readonly _tag: "RestartLsp"; readonly label: string }
  | { readonly _tag: "BrowserSupport" }

export interface ReadinessView {
  readonly icon: ReadinessIcon
  readonly title: string
  readonly steps: ReadonlyArray<ReadinessStep>
  /** A line under the steps: what still works. */
  readonly message?: string | undefined
  readonly actions: ReadonlyArray<ReadinessAction>
}

const lspStep = (status: LspStatus): ReadinessStep => {
  const label = "Language server"
  switch (status._tag) {
    case "connecting":
      return { label, state: "busy", detail: "Connecting…" }
    case "loading":
      return {
        label,
        state: "busy",
        detail: describeLspStatus(status).label,
      }
    case "ready":
      return { label, state: "done" }
    case "recovered": {
      const quarantined = status.recovery.quarantined.map(fileNameOfUri)
      return {
        label,
        state: "warning",
        detail:
          quarantined.length > 0
            ? `${quarantined.join(", ")} crashed it; features are paused for that file until its next edit`
            : `It crashed (${status.recovery.reason}) and restarted`,
      }
    }
    case "reconnecting":
      return {
        label,
        state: "busy",
        detail: `Restarting (attempt ${status.attempt} of ${status.maxAttempts})…`,
      }
    case "error":
      return { label, state: "error", detail: status.message }
  }
}

const containerSteps = (
  phase: ContainerPhase,
): ReadonlyArray<ReadinessStep> => {
  const boot = "Container booted"
  const install = "Installing dependencies"
  const types = "Loading types"
  switch (phase._tag) {
    case "booting":
      return [
        { label: boot, state: "busy" },
        { label: install, state: "pending" },
        { label: types, state: "pending" },
      ]
    case "installing":
      return [
        { label: boot, state: "done" },
        { label: install, state: "busy" },
        { label: types, state: "pending" },
      ]
    case "loading-types":
      return [
        { label: boot, state: "done" },
        { label: install, state: "done" },
        { label: types, state: "busy" },
      ]
    case "ready":
      return [
        { label: boot, state: "done" },
        { label: install, state: "done" },
        { label: types, state: "done" },
      ]
    case "failed":
      return phase.error._tag === "ContainerUnsupported"
        ? [
            {
              label: "Container",
              state: "warning",
              detail: "This browser can't run WebContainers",
            },
          ]
        : [
            {
              label: boot,
              state: "error",
              detail: "The Container didn't start",
            },
            { label: install, state: "skipped" },
            { label: types, state: "skipped" },
          ]
    case "install-failed":
      return [
        { label: boot, state: "done" },
        {
          label: install,
          state: "error",
          detail:
            phase.error.exitCode === -1
              ? "pnpm couldn't start"
              : `pnpm install exited with code ${phase.error.exitCode}`,
        },
        { label: types, state: "skipped" },
      ]
    case "dependencies-unavailable":
      return [
        { label: boot, state: "done" },
        { label: install, state: "done" },
        { label: types, state: "warning", detail: phase.reason },
      ]
  }
}

/**
 * The readiness indicator for the language server and (when there is one)
 * the Container: an icon for the worst state, and the checklist, message and
 * actions its popover shows.
 */
export const describeReadiness = (
  lsp: LspStatus,
  phase: ContainerPhase | undefined,
  runAlive: boolean,
): ReadinessView => {
  const steps = [lspStep(lsp), ...(phase ? containerSteps(phase) : [])]

  if (phase?._tag === "failed" && phase.error._tag !== "ContainerUnsupported") {
    return {
      icon: "error",
      title: "Can't run code",
      steps,
      message: "Editing, sharing and autosave still work.",
      actions: [
        { _tag: "RetryContainer", label: "Retry" },
        { _tag: "ShowFailure" },
      ],
    }
  }
  if (phase?._tag === "install-failed") {
    return {
      icon: "error",
      title: "Can't run code",
      steps,
      actions: [
        { _tag: "RetryContainer", label: "Retry install" },
        { _tag: "ShowFailure" },
      ],
    }
  }
  if (lsp._tag === "error") {
    return {
      icon: "error",
      title: "Type checking stopped",
      steps,
      message: "Diagnostics, hover and completions are off until it restarts.",
      actions: lsp.retryable
        ? [
            {
              _tag: "RestartLsp",
              label:
                lsp.code === "crashed"
                  ? "Restart language server"
                  : "Reconnect",
            },
          ]
        : [],
    }
  }
  if (phase?._tag === "failed") {
    return {
      icon: "warning",
      title: "Running code isn't available here",
      steps,
      message: "You can still edit with full type checking and share.",
      actions: [{ _tag: "BrowserSupport" }, { _tag: "ShowFailure" }],
    }
  }
  if (steps.some((step) => step.state === "busy")) {
    return { icon: "busy", title: "Getting ready", steps, actions: [] }
  }
  if (phase?._tag === "dependencies-unavailable") {
    return {
      icon: "warning",
      title: "Ready, without package types",
      steps,
      message: "Code still runs. Type errors from packages may be missing.",
      actions: [],
    }
  }
  if (lsp._tag === "recovered") {
    return {
      icon: "warning",
      title: "Language server restarted",
      steps,
      actions: [],
    }
  }
  if (runAlive) {
    return { icon: "running", title: "Running src/main.ts", steps, actions: [] }
  }
  return { icon: "ready", title: "Ready", steps, actions: [] }
}
