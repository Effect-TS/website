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
    case "capacity":
      return retryable ? "At capacity · Retry" : "At capacity"
    case "doc-too-large":
      return retryable ? "Under 256 KiB · Retry" : "Document exceeds 256 KiB"
    case "policy":
      return "Connection rejected"
    case "unreachable":
      return retryable ? "Disconnected · Retry" : "Disconnected"
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
    case "idle":
      return {
        state: "idle",
        label: "Idle · Wake",
        detail:
          "Session paused after inactivity. Type, focus the editor, or click to reconnect.",
        tone: "neutral",
        interactive: true,
        actionLabel: "Wake language server",
      }
    case "error": {
      const detail =
        status.code === "doc-too-large" && !status.retryable
          ? `${status.message} Trim the document below 256 KiB to retry.`
          : status.message
      return {
        state: "error",
        label: errorSummary(status.code, status.retryable),
        detail,
        tone: "error",
        interactive: status.retryable,
        ...(status.retryable ? { actionLabel: "Retry connection" } : {}),
      }
    }
  }
}
