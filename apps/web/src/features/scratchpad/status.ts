import type { ContainerPhase } from "./container.ts"
import type { LspErrorCode, LspStatus } from "./session.ts"

export type LspStatusTone = "neutral" | "success" | "warning" | "error"

export interface LspStatusView {
  readonly state: LspStatus["_tag"]
  readonly label: string
  readonly detail: string
  readonly tone: LspStatusTone
  readonly interactive: boolean
  readonly actionLabel?: string | undefined
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
        tone: "neutral",
        interactive: false,
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
            tone: "neutral",
            interactive: false,
          }
        case "compiling":
          return {
            state: "loading",
            label: "Compiling…",
            detail:
              "Compiling the in-browser Effect TypeScript language server.",
            tone: "neutral",
            interactive: false,
          }
        case "starting":
          return {
            state: "loading",
            label: "Starting…",
            detail:
              "Starting the in-browser Effect TypeScript language server.",
            tone: "neutral",
            interactive: false,
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
        tone: "warning",
        interactive: false,
      }
    }
    case "ready":
      return {
        state: "ready",
        label: "Ready",
        detail: "Effect TypeScript language server is connected and ready.",
        tone: "success",
        interactive: false,
      }
    case "reconnecting":
      return {
        state: "reconnecting",
        label: `Reconnecting (${status.attempt}/${status.maxAttempts})…`,
        detail: `Reconnecting to the language server (attempt ${status.attempt} of ${status.maxAttempts}).`,
        tone: "warning",
        interactive: false,
      }
    case "error": {
      return {
        state: "error",
        label: errorSummary(status.code, status.retryable),
        detail: status.message,
        tone: "error",
        interactive: status.retryable,
        ...(status.retryable
          ? {
              actionLabel:
                status.code === "crashed"
                  ? "Restart language server"
                  : "Retry connection",
            }
          : {}),
      }
    }
  }
}

export interface ContainerStatusView {
  readonly state: ContainerPhase["_tag"]
  readonly label: string
  readonly detail: string
  readonly tone: LspStatusTone
  /** Work in progress: the badge pulses. */
  readonly busy: boolean
}

export const describeContainerPhase = (
  phase: ContainerPhase,
): ContainerStatusView => {
  switch (phase._tag) {
    case "booting":
      return {
        state: "booting",
        label: "Booting…",
        detail:
          "Starting the in-browser Node.js container that runs your code.",
        tone: "neutral",
        busy: true,
      }
    case "installing":
      return {
        state: "installing",
        label: "Installing…",
        detail: "Installing dependencies with pnpm in the container.",
        tone: "neutral",
        busy: true,
      }
    case "loading-types":
      return {
        state: "loading-types",
        label: "Loading types…",
        detail:
          "Copying the installed packages' types into the language server.",
        tone: "neutral",
        busy: true,
      }
    case "ready":
      return {
        state: "ready",
        label: "Container ready",
        detail:
          "Dependencies are installed and the editor type-checks against them.",
        tone: "success",
        busy: false,
      }
    case "failed":
      return {
        state: "failed",
        label:
          phase.error._tag === "ContainerUnsupported"
            ? "Can't run here"
            : "Container failed",
        detail: `${phase.error.message} Editing still works.`,
        tone: "error",
        busy: false,
      }
    case "install-failed":
      return {
        state: "install-failed",
        label: "Install failed",
        detail: `${phase.error.message} Editing still works.`,
        tone: "error",
        busy: false,
      }
    case "dependencies-unavailable":
      return {
        state: "dependencies-unavailable",
        label: "Dependencies unavailable",
        detail: `${phase.reason} Code still runs.`,
        tone: "warning",
        busy: false,
      }
  }
}
