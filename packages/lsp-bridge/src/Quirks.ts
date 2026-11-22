export interface JsonRpcMessage {
  readonly jsonrpc?: string
  readonly id?: string | number | null
  readonly method?: string
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: unknown
}

export interface ClientToServerOutcome {
  readonly payload: string
  readonly strippedNullParams: boolean
}

/**
 * Absorb client-to-server quirks before forwarding to the LSP server:
 * - Strip `params: null` from `shutdown` and `exit` messages.
 * - Forward `$/cancelRequest` and all other messages untouched.
 */
export const transformClientToServer = (raw: string): ClientToServerOutcome => {
  let parsed: Record<string, unknown>
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { payload: raw, strippedNullParams: false }
    }
    parsed = value as Record<string, unknown>
  } catch {
    return { payload: raw, strippedNullParams: false }
  }

  if (
    (parsed.method === "shutdown" || parsed.method === "exit") &&
    parsed.params === null
  ) {
    const { params: _dropped, ...rest } = parsed
    return {
      payload: JSON.stringify(rest),
      strippedNullParams: true,
    }
  }

  return { payload: raw, strippedNullParams: false }
}

export type ServerToClientOutcome =
  | {
      readonly _tag: "Forward"
      readonly payload: string
    }
  | {
      readonly _tag: "InterceptAndReply"
      readonly method: string
      readonly id: string | number
      readonly replyPayload: string
    }

/**
 * Absorb server-to-client quirks before forwarding to the client:
 * - Intercept `client/registerCapability` requests and reply `{ result: null }` on stdin.
 */
export const transformServerToClient = (raw: string): ServerToClientOutcome => {
  let parsed: JsonRpcMessage
  try {
    parsed = JSON.parse(raw) as JsonRpcMessage
  } catch {
    return { _tag: "Forward", payload: raw }
  }

  if (
    parsed.method === "client/registerCapability" &&
    (typeof parsed.id === "string" || typeof parsed.id === "number")
  ) {
    return {
      _tag: "InterceptAndReply",
      method: parsed.method,
      id: parsed.id,
      replyPayload: JSON.stringify({
        jsonrpc: "2.0",
        id: parsed.id,
        result: null,
      }),
    }
  }

  return { _tag: "Forward", payload: raw }
}
