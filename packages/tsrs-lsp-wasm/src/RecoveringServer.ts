/**
 * Crash recovery over LspInstance.
 *
 * A trap leaves the instance's memory in an unknown state, so the instance is thrown away. This keeps what is
 * needed to rebuild the session from the client's point of view: the `initialize` params (replayed with a host id,
 * the response dropped), whether `initialized` was sent, and every open document's version and full text
 * (`didChange` edits are applied here too, in UTF-16 units, since the client believes they were applied). The file
 * system is shared, so files that are not open need no replay.
 *
 * On a trap it instantiates the same compiled module, replays initialize, initialized and one didOpen per open
 * document, and answers a trapping request with RequestFailed (-32803) so the client does not wait.
 *
 * Quarantine: some documents crash the server by their text alone (deep nesting overflows the engine stack in the
 * parser or checker). A document whose didOpen/didChange trapped is quarantined before the rebuild, because those
 * messages only parse and the replay would trap again. A document that traps twice at the same version is
 * quarantined too (a pull that overflows in the checker survives the replay and would trap on the next pull). If a
 * replay still traps, the named document (or, without one, every open document) is quarantined and the rebuild is
 * retried, up to `maxAttempts` times. Requests for a quarantined document get an error without reaching the
 * server; its next didChange lifts the quarantine and reopens it with the new text.
 *
 * Lost on a restart: checker and auto-import caches (the next requests pay the cold cost again), pending server
 * timers, and server-to-client requests in flight (the single-thread server never waits for their replies).
 */
import {
  instantiateLspInstance,
  LspInstanceDiedError,
  PumpStatus,
  type LspInstance,
  type LspInstanceOptions,
} from "./LspInstance.ts"

/** JSON-RPC RequestFailed. */
export const REQUEST_FAILED = -32803

export interface RecoveryEvent {
  /** The trap, as "Name: message". */
  readonly reason: string
  /** The method of the message that trapped ("$tick" for a background tick). */
  readonly method: string | undefined
  readonly uri: string | undefined
  /** Total time from the trap to a working instance. */
  readonly ms: number
  readonly instantiateMs: number
  readonly replayMs: number
  /** Documents replayed into the new instance. */
  readonly documents: number
  readonly quarantined: ReadonlyArray<string>
  /** 1 for the first rebuild; more when a replay trapped. */
  readonly attempt: number
}

export interface RecoveringServerOptions extends LspInstanceOptions {
  readonly onRecovery?: (event: RecoveryEvent) => void
  /** Rebuilds per trapping message before giving up (default 3). */
  readonly maxAttempts?: number
}

export interface RecoveringServer {
  readonly send: (message: string) => Promise<Array<string>>
  readonly tick: () => Promise<Array<string>>
  readonly status: PumpStatus
  readonly nextTimerMs: () => number
  readonly memoryBytes: () => number
  readonly recoveries: ReadonlyArray<RecoveryEvent>
  readonly quarantined: ReadonlySet<string>
  /** Open documents as the server should see them (uri -> version and text). */
  readonly documents: ReadonlyMap<string, OpenDocument>
}

export interface OpenDocument {
  readonly languageId: string
  readonly version: number
  readonly text: string
}

export class RecoveryFailedError extends Error {
  constructor(attempts: number, cause: unknown) {
    super(
      `tsrs-lsp: could not restart the server after ${attempts} attempts: ${(cause as Error)?.message ?? String(cause)}`,
      { cause },
    )
    this.name = "RecoveryFailedError"
  }
}

interface Position {
  readonly line: number
  readonly character: number
}

interface ContentChange {
  readonly range?: { readonly start: Position; readonly end: Position }
  readonly text: string
}

interface Message {
  readonly id?: number | string | null
  readonly method?: string
  readonly params?: {
    readonly textDocument?: {
      readonly uri?: string
      readonly languageId?: string
      readonly version?: number
      readonly text?: string
    }
    readonly contentChanges?: ReadonlyArray<ContentChange>
  }
}

/** Applies LSP content changes (full or ranged, UTF-16 positions) to a text. */
export const applyContentChanges = (
  text: string,
  changes: ReadonlyArray<ContentChange>,
): string => {
  for (const change of changes) {
    if (change.range === undefined) {
      text = change.text
      continue
    }
    const current = text
    const offset = (p: Position) => {
      let o = 0
      for (let line = 0; line < p.line; line++) {
        const nl = current.indexOf("\n", o)
        if (nl < 0) return current.length
        o = nl + 1
      }
      const lineEnd = current.indexOf("\n", o)
      return Math.min(o + p.character, lineEnd < 0 ? current.length : lineEnd)
    }
    text =
      current.slice(0, offset(change.range.start)) +
      change.text +
      current.slice(offset(change.range.end))
  }
  return text
}

const describe = (error: unknown) => {
  const e = error instanceof LspInstanceDiedError ? error.cause : error
  return e instanceof Error ? `${e.name}: ${e.message}` : `Error: ${String(e)}`
}

export const startRecoveringServer = async (
  module: WebAssembly.Module,
  options: RecoveringServerOptions,
): Promise<RecoveringServer> => {
  const onRecovery = options.onRecovery ?? (() => {})
  const maxAttempts = options.maxAttempts ?? 3
  let inner: LspInstance = await instantiateLspInstance(module, options)
  let initializeParams: unknown
  let initialized = false
  const documents = new Map<
    string,
    { languageId: string; version: number; text: string }
  >()
  const quarantined = new Set<string>()
  const crashedAt = new Map<string, number>()
  const recoveries: Array<RecoveryEvent> = []
  let replayId = 0

  const track = (msg: Message) => {
    const doc = msg.params?.textDocument
    switch (msg.method) {
      case "initialize":
        initializeParams = msg.params
        break
      case "initialized":
        initialized = true
        break
      case "textDocument/didOpen":
        if (doc?.uri !== undefined) {
          documents.set(doc.uri, {
            languageId: doc.languageId ?? "typescript",
            version: doc.version ?? 0,
            text: doc.text ?? "",
          })
        }
        break
      case "textDocument/didChange": {
        const d = doc?.uri === undefined ? undefined : documents.get(doc.uri)
        if (d !== undefined) {
          d.text = applyContentChanges(d.text, msg.params?.contentChanges ?? [])
          if (doc?.version !== undefined) d.version = doc.version
        }
        break
      }
      case "textDocument/didClose":
        if (doc?.uri !== undefined) {
          documents.delete(doc.uri)
          quarantined.delete(doc.uri)
          crashedAt.delete(doc.uri)
        }
        break
    }
  }

  // A fresh instance with the session replayed into it, leaving out `skip`. Throws if the replay traps.
  const rebuild = async (skip: ReadonlySet<string>) => {
    const t0 = performance.now()
    const next = await instantiateLspInstance(module, options)
    const instantiateMs = performance.now() - t0
    const t1 = performance.now()
    const replay = (m: object) => {
      next.send(JSON.stringify({ jsonrpc: "2.0", ...m }))
      while (next.status === PumpStatus.Pending) next.tick()
    }
    if (initializeParams !== undefined) {
      replay({
        id: `tsrs-lsp-host-replay:${++replayId}`,
        method: "initialize",
        params: initializeParams,
      })
    }
    if (initialized) replay({ method: "initialized", params: {} })
    let count = 0
    for (const [uri, d] of documents) {
      if (skip.has(uri)) continue
      replay({
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri,
            languageId: d.languageId,
            version: d.version,
            text: d.text,
          },
        },
      })
      count++
    }
    return {
      next,
      instantiateMs,
      replayMs: performance.now() - t1,
      documents: count,
    }
  }

  const recover = async (cause: unknown, msg: Message) => {
    const t0 = performance.now()
    const uri = msg.params?.textDocument?.uri
    const doc = uri === undefined ? undefined : documents.get(uri)
    if (uri !== undefined && doc !== undefined) {
      if (crashedAt.get(uri) === doc.version) quarantined.add(uri)
      crashedAt.set(uri, doc.version)
      if (
        msg.method === "textDocument/didOpen" ||
        msg.method === "textDocument/didChange"
      )
        quarantined.add(uri)
    }
    let lastError: unknown = cause
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const r = await rebuild(quarantined)
        inner = r.next
        const event: RecoveryEvent = {
          reason: describe(cause),
          method: msg.method,
          uri,
          ms: performance.now() - t0,
          instantiateMs: r.instantiateMs,
          replayMs: r.replayMs,
          documents: r.documents,
          quarantined: [...quarantined],
          attempt,
        }
        recoveries.push(event)
        onRecovery(event)
        return
      } catch (error) {
        lastError = error
        if (!(error instanceof LspInstanceDiedError)) throw error
        if (uri !== undefined && documents.has(uri) && !quarantined.has(uri))
          quarantined.add(uri)
        else for (const u of documents.keys()) quarantined.add(u)
      }
    }
    throw new RecoveryFailedError(maxAttempts, lastError)
  }

  const errorResponse = (msg: Message, message: string) =>
    JSON.stringify({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: REQUEST_FAILED, message },
    })

  const send = async (json: string): Promise<Array<string>> => {
    const msg = JSON.parse(json) as Message
    const uri = msg.params?.textDocument?.uri
    const isRequest = msg.id !== undefined && msg.method !== undefined
    if (uri !== undefined && quarantined.has(uri)) {
      track(msg)
      if (msg.method === "textDocument/didChange") {
        // New text: try it.
        quarantined.delete(uri)
        const d = documents.get(uri)!
        return send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didOpen",
            params: {
              textDocument: {
                uri,
                languageId: d.languageId,
                version: d.version,
                text: d.text,
              },
            },
          }),
        )
      }
      return isRequest
        ? [
            errorResponse(
              msg,
              `tsrs-lsp: ${uri} is quarantined (its contents crashed the server)`,
            ),
          ]
        : []
    }
    track(msg)
    try {
      return inner.send(json)
    } catch (error) {
      // Only a trap kills the instance (LspInstance throws LspInstanceDiedError for those); rethrow the rest.
      if (!(error instanceof LspInstanceDiedError)) throw error
      await recover(error, msg)
      return isRequest
        ? [
            errorResponse(
              msg,
              `tsrs-lsp: the server crashed handling ${msg.method} and was restarted (${describe(error)})`,
            ),
          ]
        : []
    }
  }

  return {
    send,
    tick: async () => {
      try {
        return inner.tick()
      } catch (error) {
        if (!(error instanceof LspInstanceDiedError)) throw error
        await recover(error, { method: "$tick" })
        return []
      }
    },
    get status() {
      return inner.status
    },
    nextTimerMs: () => inner.nextTimerMs(),
    memoryBytes: () => inner.memoryBytes(),
    recoveries,
    quarantined,
    documents,
  }
}
