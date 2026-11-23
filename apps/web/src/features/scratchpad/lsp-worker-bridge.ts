/**
 * The glue between the page and the in-browser language server. It runs
 * inside the language server Web Worker, between the page's JSON-RPC strings
 * and the tsrs host (`@website/tsrs-lsp-wasm`), and has no browser
 * dependencies so it can be unit tested against a fake host.
 *
 * - Pull-to-push diagnostics. tsrs computes file diagnostics only on
 *   `textDocument/diagnostic` pulls and `@codemirror/lsp-client` only renders
 *   pushed `textDocument/publishDiagnostics`. The bridge pulls after every
 *   `didOpen` and `didChange` (debounced), pulls the other open documents a
 *   little later (cross-file effects), pulls everything after a Workspace file
 *   system change, answers `didClose` with an empty push, and sends each pull
 *   result to the page as a push carrying the pulled version. Bridge requests
 *   use the `worker:` id namespace and their responses never reach the page.
 *   The server's own empty pushes (it sends them for `tsconfig.json`) are
 *   dropped, as the server bridge does.
 * - Workspace file system. The page mirrors the Scratchpad Workspace into the
 *   worker's in-memory file system with `WorkspaceFsOp`s. Content changes to
 *   documents that are open in the language server are held back (the open
 *   document is authoritative, and writing it would send a watched-file event
 *   per keystroke) and written when the document closes. Files that are not
 *   open, creations, deletions and renames go straight to the file system,
 *   which the host turns into `workspace/didChangeWatchedFiles`.
 *   `tsconfig.json` is a Workspace file like any other: the worker writes no
 *   hidden one (ADR 0004).
 * - Installed types. `ReplaceNodeModules` swaps everything below
 *   `node_modules` for the Container's types pack in one synchronous step, so
 *   the host reports it in one coalesced watched-files flush, and answers
 *   with `TypesMounted` or `TypesRejected` through `onTypes`. A pack that
 *   does not decode leaves the previous types in place.
 * - Quarantine. When the host quarantines a document whose text crashes the
 *   server, its pulls fail. The bridge then pushes one warning diagnostic that
 *   says why the file has no language features until it is edited.
 * - Quirks. `params: null` is stripped from `shutdown` and `exit`, as the
 *   server bridge does. The host already answers `client/registerCapability`.
 */
import {
  applyContentChanges,
  decodeTypesPack,
  fileUriToPath,
  pathToFileUri,
  REQUEST_FAILED,
} from "@website/tsrs-lsp-wasm"
import type { TypesMountResult, WorkspaceFsOp } from "./worker-protocol.ts"

export const BRIDGE_REQUEST_ID_PREFIX = "worker:"
export const OWN_PULL_DELAY_MS = 20
export const CROSS_FILE_PULL_DELAY_MS = 200
export const QUARANTINE_DIAGNOSTIC_CODE = "scratchpad-quarantined"
export const QUARANTINE_MESSAGE =
  "Language features are paused for this file: its contents crashed the in-browser language server (usually very deep nesting). Edit the file to try again."

/** The subset of the host's `MemoryFileSystem` the bridge uses. */
export interface BridgeFileSystem {
  readonly exists: (path: string) => boolean
  readonly writeFile: (path: string, data: string | Uint8Array) => void
  readonly remove: (path: string) => boolean
  readonly rename: (from: string, to: string) => void
  readonly listFiles: (directory?: string) => Array<string>
}

/** The subset of the host (`LspHost`) the bridge uses once it is started. */
export interface BridgeServer {
  readonly send: (message: string) => Promise<void>
  readonly quarantined: ReadonlySet<string>
}

export interface BridgeTimers {
  readonly setTimeout: (callback: () => void, ms: number) => unknown
  readonly clearTimeout: (handle: unknown) => void
  readonly now: () => number
}

export const defaultTimers: BridgeTimers = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) =>
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => performance.now(),
}

export interface LspWorkerBridgeOptions {
  readonly fs: BridgeFileSystem
  /** Sends one JSON-RPC string to the page. */
  readonly postToPage: (message: string) => void
  /** The workspace root path, default `/workspace`. */
  readonly rootPath?: string
  readonly timers?: BridgeTimers
  readonly ownPullDelayMs?: number
  readonly crossFilePullDelayMs?: number
  /** Receives the answer to each `ReplaceNodeModules` op. */
  readonly onTypes?: (result: TypesMountResult) => void
}

export interface LspWorkerBridge {
  /** Starts forwarding to the server. Messages received before are queued. */
  readonly connect: (server: BridgeServer) => void
  /** A JSON-RPC string from the page. */
  readonly handleClientMessage: (raw: string) => void
  /** A JSON-RPC string from the host (wire this to the host's `onMessage`). */
  readonly handleServerMessage: (raw: string) => void
  /** A Workspace change from the page. Works before `connect` too. */
  readonly applyFsOp: (op: WorkspaceFsOp) => void
  /** Open documents and the version the bridge last saw. */
  readonly openDocuments: () => ReadonlyMap<string, number | undefined>
  readonly dispose: () => void
}

interface JsonRpc {
  readonly id?: unknown
  readonly method?: unknown
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: { readonly code?: unknown; readonly message?: unknown }
}

interface OpenDocument {
  version: number | undefined
  text: string
}

interface PendingPull {
  readonly uri: string
  readonly version: number | undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parse = (raw: string): JsonRpc | undefined => {
  try {
    const value: unknown = JSON.parse(raw)
    return isRecord(value) ? (value as JsonRpc) : undefined
  } catch {
    return undefined
  }
}

const textDocumentOf = (
  params: unknown,
):
  | {
      readonly uri: string
      readonly version: number | undefined
      readonly text: string | undefined
    }
  | undefined => {
  if (!isRecord(params) || !isRecord(params.textDocument)) return undefined
  const doc = params.textDocument
  if (typeof doc.uri !== "string") return undefined
  return {
    uri: doc.uri,
    version: typeof doc.version === "number" ? doc.version : undefined,
    text: typeof doc.text === "string" ? doc.text : undefined,
  }
}

/** `params: null` on `shutdown`/`exit` trips tsrs (same quirk as the server bridge). */
export const stripNullParams = (raw: string, message: JsonRpc): string => {
  if (
    (message.method === "shutdown" || message.method === "exit") &&
    message.params === null
  ) {
    const { params: _dropped, ...rest } = message as Record<string, unknown>
    return JSON.stringify(rest)
  }
  return raw
}

/** The warning pushed for a quarantined document: the first line, or the start of an empty file. */
export const quarantineDiagnostic = (text: string) => {
  const firstLineEnd = text.indexOf("\n")
  const end = firstLineEnd === -1 ? text.length : firstLineEnd
  return {
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: end },
    },
    severity: 2,
    source: "scratchpad",
    code: QUARANTINE_DIAGNOSTIC_CODE,
    message: QUARANTINE_MESSAGE,
  }
}

export const makeLspWorkerBridge = (
  options: LspWorkerBridgeOptions,
): LspWorkerBridge => {
  const fs = options.fs
  const rootPath = (options.rootPath ?? "/workspace").replace(/\/+$/, "")
  const timers = options.timers ?? defaultTimers
  const ownDelay = options.ownPullDelayMs ?? OWN_PULL_DELAY_MS
  const crossDelay = options.crossFilePullDelayMs ?? CROSS_FILE_PULL_DELAY_MS

  let server: BridgeServer | undefined
  let disposed = false
  const queued: Array<string> = []
  const open = new Map<string, OpenDocument>()
  // Absolute path -> newest content of a file that is open in the server.
  const shadow = new Map<string, string>()
  // URI -> time its pull is due.
  const due = new Map<string, number>()
  let timer: unknown
  let timerAt = Number.POSITIVE_INFINITY
  let nextId = 1
  const pendingPulls = new Map<string, PendingPull>()
  // URI -> version re-pulled once after a crash in its pull.
  const retriedAfterCrash = new Map<string, number | undefined>()

  const toAbsolute = (relPath: string) =>
    `${rootPath}/${relPath.replace(/^\/+/, "")}`
  const uriOfAbsolute = (absPath: string) => pathToFileUri(absPath)
  const absoluteOfUri = (uri: string): string | undefined => {
    try {
      return fileUriToPath(uri)
    } catch {
      return undefined
    }
  }
  const isBelow = (path: string, dir: string) =>
    path === dir || path.startsWith(`${dir}/`)

  const sendToServer = (message: string) => {
    if (disposed) return
    if (server === undefined) {
      queued.push(message)
      return
    }
    // The host rejects only after a fatal error or dispose, which the worker
    // reports through its own channel.
    void server.send(message).catch(() => {})
  }

  const publish = (
    uri: string,
    version: number | undefined,
    diagnostics: ReadonlyArray<unknown>,
  ) => {
    options.postToPage(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: {
          uri,
          ...(version !== undefined ? { version } : {}),
          diagnostics,
        },
      }),
    )
  }

  const armTimer = () => {
    if (disposed || server === undefined) return
    let earliest = Number.POSITIVE_INFINITY
    for (const at of due.values()) earliest = Math.min(earliest, at)
    if (earliest === Number.POSITIVE_INFINITY) return
    if (timer !== undefined && earliest >= timerAt) return
    if (timer !== undefined) timers.clearTimeout(timer)
    timerAt = earliest
    timer = timers.setTimeout(
      () => {
        timer = undefined
        timerAt = Number.POSITIVE_INFINITY
        flushDue()
      },
      Math.max(0, earliest - timers.now()),
    )
  }

  const markDirty = (uri: string, delayMs: number) => {
    if (!open.has(uri)) return
    const at = timers.now() + delayMs
    const prev = due.get(uri)
    if (prev === undefined || at < prev) due.set(uri, at)
    armTimer()
  }

  const markOthersDirty = (exceptUri: string | undefined) => {
    for (const uri of open.keys()) {
      if (uri !== exceptUri) markDirty(uri, crossDelay)
    }
  }

  const pull = (uri: string) => {
    const doc = open.get(uri)
    if (doc === undefined) return
    const id = `${BRIDGE_REQUEST_ID_PREFIX}diagnostic:${nextId++}`
    pendingPulls.set(id, { uri, version: doc.version })
    sendToServer(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "textDocument/diagnostic",
        params: { textDocument: { uri } },
      }),
    )
  }

  const flushDue = () => {
    const now = timers.now()
    for (const [uri, at] of [...due]) {
      if (at > now) continue
      due.delete(uri)
      pull(uri)
    }
    armTimer()
  }

  const flushShadow = (absPath: string) => {
    const content = shadow.get(absPath)
    if (content === undefined) return
    shadow.delete(absPath)
    fs.writeFile(absPath, content)
  }

  const trackClientMessage = (message: JsonRpc) => {
    const doc = textDocumentOf(message.params)
    if (doc === undefined) return
    switch (message.method) {
      case "textDocument/didOpen": {
        open.set(doc.uri, { version: doc.version, text: doc.text ?? "" })
        retriedAfterCrash.delete(doc.uri)
        markDirty(doc.uri, 0)
        markOthersDirty(doc.uri)
        break
      }
      case "textDocument/didChange": {
        const current = open.get(doc.uri)
        if (current === undefined) break
        const params = message.params as { contentChanges?: unknown }
        if (Array.isArray(params.contentChanges)) {
          current.text = applyContentChanges(
            current.text,
            params.contentChanges as Parameters<typeof applyContentChanges>[1],
          )
        }
        current.version = doc.version
        retriedAfterCrash.delete(doc.uri)
        markDirty(doc.uri, ownDelay)
        markOthersDirty(doc.uri)
        break
      }
      case "textDocument/didClose": {
        if (!open.delete(doc.uri)) break
        due.delete(doc.uri)
        retriedAfterCrash.delete(doc.uri)
        publish(doc.uri, undefined, [])
        const absPath = absoluteOfUri(doc.uri)
        if (absPath !== undefined) flushShadow(absPath)
        markOthersDirty(doc.uri)
        break
      }
    }
  }

  const handleClientMessage = (raw: string) => {
    if (disposed) return
    const message = parse(raw)
    if (message === undefined) {
      sendToServer(raw)
      return
    }
    const payload = stripNullParams(raw, message)
    // Forward first: the pulls this schedules must queue behind the change.
    sendToServer(payload)
    trackClientMessage(message)
  }

  const handlePullResponse = (id: string, message: JsonRpc) => {
    const pending = pendingPulls.get(id)
    pendingPulls.delete(id)
    if (pending === undefined) return
    const doc = open.get(pending.uri)
    // Closed, or edited since: a newer pull is already scheduled.
    if (doc === undefined || doc.version !== pending.version) return

    if (message.error !== undefined) {
      if (server?.quarantined.has(pending.uri)) {
        publish(pending.uri, pending.version, [quarantineDiagnostic(doc.text)])
        return
      }
      // The pull crashed the server and the host restarted it. Pull once
      // more: either it passes now or the host quarantines the document.
      if (
        message.error.code === REQUEST_FAILED &&
        !(
          retriedAfterCrash.has(pending.uri) &&
          retriedAfterCrash.get(pending.uri) === pending.version
        )
      ) {
        retriedAfterCrash.set(pending.uri, pending.version)
        markDirty(pending.uri, 0)
      }
      return
    }

    const result = message.result
    const items =
      isRecord(result) && Array.isArray(result.items) ? result.items : []
    publish(pending.uri, pending.version, items)
  }

  const handleServerMessage = (raw: string) => {
    if (disposed) return
    if (raw.includes(BRIDGE_REQUEST_ID_PREFIX)) {
      const message = parse(raw)
      if (
        message !== undefined &&
        typeof message.id === "string" &&
        message.id.startsWith(BRIDGE_REQUEST_ID_PREFIX) &&
        message.method === undefined
      ) {
        handlePullResponse(message.id, message)
        return
      }
    }
    if (raw.includes('"textDocument/publishDiagnostics"')) {
      const message = parse(raw)
      if (
        message?.method === "textDocument/publishDiagnostics" &&
        isRecord(message.params) &&
        Array.isArray(message.params.diagnostics) &&
        message.params.diagnostics.length === 0
      ) {
        return
      }
    }
    options.postToPage(raw)
  }

  const nodeModulesPath = `${rootPath}/node_modules`
  const isWorkspaceFile = (absPath: string) =>
    !isBelow(absPath, nodeModulesPath)

  const isOpenPath = (absPath: string) => open.has(uriOfAbsolute(absPath))

  const writeWorkspaceFile = (absPath: string, content: string) => {
    if (isOpenPath(absPath)) {
      shadow.set(absPath, content)
      return false
    }
    shadow.delete(absPath)
    fs.writeFile(absPath, content)
    return true
  }

  const applyFsOp = (op: WorkspaceFsOp) => {
    if (disposed) return
    let touched = false
    switch (op._tag) {
      case "Reset": {
        const next = new Set(Object.keys(op.files).map(toAbsolute))
        for (const absPath of fs.listFiles(rootPath)) {
          if (isWorkspaceFile(absPath) && !next.has(absPath)) {
            fs.remove(absPath)
            touched = true
          }
        }
        for (const absPath of [...shadow.keys()]) {
          if (!next.has(absPath)) shadow.delete(absPath)
        }
        for (const [relPath, content] of Object.entries(op.files)) {
          touched = writeWorkspaceFile(toAbsolute(relPath), content) || touched
        }
        break
      }
      case "WriteFile": {
        touched = writeWorkspaceFile(toAbsolute(op.path), op.content)
        break
      }
      case "Remove": {
        const absPath = toAbsolute(op.path)
        for (const key of [...shadow.keys()]) {
          if (isBelow(key, absPath)) shadow.delete(key)
        }
        if (fs.exists(absPath)) touched = fs.remove(absPath)
        break
      }
      case "Rename": {
        const from = toAbsolute(op.from)
        const to = toAbsolute(op.to)
        if (from === to) break
        const moved: Array<[string, string]> = []
        for (const [key, content] of [...shadow]) {
          if (isBelow(key, from)) {
            shadow.delete(key)
            moved.push([to + key.slice(from.length), content])
          }
        }
        if (fs.exists(from)) {
          if (fs.exists(to)) fs.remove(to)
          fs.rename(from, to)
          touched = true
        }
        for (const [absPath, content] of moved) {
          touched = writeWorkspaceFile(absPath, content) || touched
        }
        break
      }
      case "ReplaceNodeModules": {
        let pack: ReturnType<typeof decodeTypesPack>
        try {
          pack = decodeTypesPack(op.pack)
        } catch (error) {
          options.onTypes?.({
            _tag: "TypesRejected",
            id: op.id,
            message: error instanceof Error ? error.message : String(error),
          })
          return
        }
        fs.remove(nodeModulesPath)
        let bytes = 0
        for (const file of pack.files) {
          fs.writeFile(`${nodeModulesPath}/${file.path}`, file.data)
          bytes += file.data.byteLength
        }
        touched = true
        options.onTypes?.({
          _tag: "TypesMounted",
          id: op.id,
          files: pack.files.length,
          bytes,
          packages: pack.packages,
        })
        break
      }
    }
    if (touched) markOthersDirty(undefined)
  }

  return {
    connect: (next) => {
      if (disposed) return
      server = next
      for (const message of queued.splice(0)) sendToServer(message)
      armTimer()
    },
    handleClientMessage,
    handleServerMessage,
    applyFsOp,
    openDocuments: () =>
      new Map([...open].map(([uri, doc]) => [uri, doc.version])),
    dispose: () => {
      disposed = true
      if (timer !== undefined) timers.clearTimeout(timer)
      timer = undefined
      due.clear()
      pendingPulls.clear()
    },
  }
}
