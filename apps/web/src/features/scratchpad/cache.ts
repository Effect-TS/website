import type { Transport } from "@codemirror/lsp-client"

export const CACHEABLE_LSP_METHODS = new Set<string>([
  "textDocument/hover",
  "textDocument/definition",
  "textDocument/declaration",
  "textDocument/typeDefinition",
  "textDocument/implementation",
  "textDocument/signatureHelp",
  "textDocument/completion",
  "completionItem/resolve",
  "textDocument/prepareRename",
  "textDocument/documentHighlight",
  "textDocument/references",
])

export const DEFAULT_LSP_CACHE_MAX_ENTRIES = 500

export interface CachedLspTransportOptions {
  readonly maxEntries?: number
  readonly cacheableMethods?: ReadonlySet<string>
}

export interface CachedLspTransport {
  readonly transport: Transport
  readonly clear: () => void
  readonly resetPending: () => void
  readonly replayIncoming: (raw: string) => void
}

interface JsonRpcRecord {
  readonly jsonrpc?: string
  readonly id?: string | number
  readonly method?: string
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Dual-seed FNV-1a hash + string length for fast, collision-resistant
 * single-file document fingerprinting without async crypto overhead.
 */
const hashText = (text: string): string => {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 ^= c
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= c ^ (i & 0xff)
    h2 = Math.imul(h2, 0x85ebca6b)
  }
  return `${text.length}:${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}`
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const v = value[key]
      if (v !== undefined) {
        sorted[key] = canonicalize(v)
      }
    }
    return sorted
  }
  return value
}

const positionToOffset = (
  text: string,
  line: number,
  character: number,
): number => {
  let currentLine = 0
  let offset = 0
  while (currentLine < line && offset < text.length) {
    const nl = text.indexOf("\n", offset)
    if (nl === -1) return text.length
    offset = nl + 1
    currentLine += 1
  }
  return Math.min(text.length, offset + Math.max(0, character))
}

const applyContentChanges = (
  previous: string,
  changes: ReadonlyArray<unknown>,
): string => {
  let text = previous
  for (const change of changes) {
    if (!isRecord(change) || typeof change.text !== "string") continue
    const range = change.range
    if (
      isRecord(range) &&
      isRecord(range.start) &&
      isRecord(range.end) &&
      typeof range.start.line === "number" &&
      typeof range.start.character === "number" &&
      typeof range.end.line === "number" &&
      typeof range.end.character === "number"
    ) {
      const start = positionToOffset(
        text,
        range.start.line,
        range.start.character,
      )
      const end = positionToOffset(text, range.end.line, range.end.character)
      text = text.slice(0, start) + change.text + text.slice(end)
    } else {
      text = change.text
    }
  }
  return text
}

/**
 * Wraps a CodeMirror LSP `Transport` with a bounded, document-content-keyed
 * in-memory LRU cache and in-flight request deduplication for read-only LSP
 * queries (`hover`, `definition`, `completion`, `signatureHelp`, etc.).
 *
 * - Repeated queries on unchanged buffer contents resolve locally in 0 ms
 *   without touching the remote LSP endpoint.
 * - Edits update the tracked document fingerprint immediately so stale results
 *   are never served, while undoing back to a previous buffer or reconnecting
 *   after idle eviction still benefits from cached entries.
 * - Identical concurrent in-flight requests coalesce onto a single upstream
 *   LSP request.
 * - Error responses, lifecycle messages, and mutating requests are never cached.
 */
export const createCachedLspTransport = (
  inner: Transport,
  options?: CachedLspTransportOptions,
): CachedLspTransport => {
  const maxEntries = Math.max(
    1,
    options?.maxEntries ?? DEFAULT_LSP_CACHE_MAX_ENTRIES,
  )
  const cacheableMethods = options?.cacheableMethods ?? CACHEABLE_LSP_METHODS

  // Insertion-ordered Map used as an LRU cache: oldest entry first.
  const lru = new Map<string, unknown>()
  const docTexts = new Map<string, string>()
  const docHashes = new Map<string, string>()
  let workspaceFingerprint = ""

  const recomputeWorkspaceFingerprint = () => {
    if (docHashes.size === 0) {
      workspaceFingerprint = ""
      return
    }
    const entries = Array.from(docHashes.entries()).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )
    workspaceFingerprint = hashText(
      entries.map(([uri, hash]) => `${uri}=${hash}`).join("\n"),
    )
  }

  interface PendingGroup {
    readonly upstreamId: string | number
    readonly cacheKey: string
    readonly waiters: Array<string | number>
  }

  const pendingByUpstreamId = new Map<string | number, PendingGroup>()
  const pendingByCacheKey = new Map<string, PendingGroup>()
  const clientIdToGroup = new Map<string | number, PendingGroup>()

  const handlers = new Set<(value: string) => void>()

  let innerSubscribed = false

  const emitToHandlers = (raw: string) => {
    for (const handler of handlers) {
      handler(raw)
    }
  }

  const touchLru = (key: string, value: unknown) => {
    if (lru.has(key)) {
      lru.delete(key)
    }
    lru.set(key, value)
    while (lru.size > maxEntries) {
      const oldest = lru.keys().next().value
      if (oldest === undefined) break
      lru.delete(oldest)
    }
  }

  const getLru = (
    key: string,
  ):
    | { readonly found: true; readonly value: unknown }
    | { readonly found: false } => {
    if (!lru.has(key)) {
      return { found: false }
    }
    const value = lru.get(key)
    lru.delete(key)
    lru.set(key, value)
    return { found: true, value }
  }

  const extractUri = (params: unknown): string | undefined => {
    if (!isRecord(params)) return undefined
    if (
      isRecord(params.textDocument) &&
      typeof params.textDocument.uri === "string"
    ) {
      return params.textDocument.uri
    }
    if (typeof params.uri === "string") {
      return params.uri
    }
    return undefined
  }

  const buildCacheKey = (
    method: string,
    params: unknown,
  ): string | undefined => {
    const uri = extractUri(params)
    const docHash =
      uri !== undefined
        ? docHashes.get(uri)
        : docHashes.size >= 1
          ? workspaceFingerprint
          : undefined
    if (docHash === undefined || workspaceFingerprint.length === 0) {
      return undefined
    }
    return `${workspaceFingerprint}|${method}|${JSON.stringify(canonicalize(params ?? null))}`
  }

  const handleInnerMessage = (raw: string) => {
    let parsed: JsonRpcRecord | undefined
    try {
      const value = JSON.parse(raw) as unknown
      if (isRecord(value)) {
        parsed = value as JsonRpcRecord
      }
    } catch {
      emitToHandlers(raw)
      return
    }

    if (
      parsed !== undefined &&
      parsed.id !== undefined &&
      parsed.method === undefined
    ) {
      const group = pendingByUpstreamId.get(parsed.id)
      if (group !== undefined) {
        pendingByUpstreamId.delete(parsed.id)
        if (pendingByCacheKey.get(group.cacheKey) === group) {
          pendingByCacheKey.delete(group.cacheKey)
        }

        const isSuccess = !("error" in parsed) || parsed.error === undefined
        if (isSuccess) {
          touchLru(group.cacheKey, parsed.result ?? null)
        }

        for (const waiterId of group.waiters) {
          clientIdToGroup.delete(waiterId)
          if (waiterId === parsed.id) {
            emitToHandlers(raw)
          } else if (isSuccess) {
            emitToHandlers(
              JSON.stringify({
                jsonrpc: "2.0",
                id: waiterId,
                result: parsed.result ?? null,
              }),
            )
          } else {
            emitToHandlers(
              JSON.stringify({
                jsonrpc: "2.0",
                id: waiterId,
                error: parsed.error,
              }),
            )
          }
        }
        return
      }
    }

    emitToHandlers(raw)
  }

  const resetPending = () => {
    pendingByUpstreamId.clear()
    pendingByCacheKey.clear()
    clientIdToGroup.clear()
  }

  const transport: Transport = {
    send(message: string) {
      let parsed: JsonRpcRecord | undefined
      try {
        const value = JSON.parse(message) as unknown
        if (isRecord(value)) {
          parsed = value as JsonRpcRecord
        }
      } catch {
        inner.send(message)
        return
      }

      if (parsed === undefined || typeof parsed.method !== "string") {
        inner.send(message)
        return
      }

      const method = parsed.method
      const params = parsed.params

      // Track document content changes so cache keys always reflect live text.
      if (
        method === "textDocument/didOpen" &&
        isRecord(params) &&
        isRecord(params.textDocument) &&
        typeof params.textDocument.uri === "string" &&
        typeof params.textDocument.text === "string"
      ) {
        const uri = params.textDocument.uri
        const text = params.textDocument.text
        docTexts.set(uri, text)
        docHashes.set(uri, hashText(text))
        recomputeWorkspaceFingerprint()
        inner.send(message)
        return
      }

      if (
        method === "textDocument/didChange" &&
        isRecord(params) &&
        isRecord(params.textDocument) &&
        typeof params.textDocument.uri === "string" &&
        Array.isArray(params.contentChanges)
      ) {
        const uri = params.textDocument.uri
        const prev = docTexts.get(uri) ?? ""
        const next = applyContentChanges(prev, params.contentChanges)
        docTexts.set(uri, next)
        docHashes.set(uri, hashText(next))
        recomputeWorkspaceFingerprint()
        inner.send(message)
        return
      }

      if (
        method === "textDocument/didClose" &&
        isRecord(params) &&
        isRecord(params.textDocument) &&
        typeof params.textDocument.uri === "string"
      ) {
        const uri = params.textDocument.uri
        docTexts.delete(uri)
        docHashes.delete(uri)
        recomputeWorkspaceFingerprint()
        inner.send(message)
        return
      }

      // Handle cancellation for tracked/coalesced requests.
      if (
        method === "$/cancelRequest" &&
        isRecord(params) &&
        (typeof params.id === "number" || typeof params.id === "string")
      ) {
        const cancelledId = params.id
        const group = clientIdToGroup.get(cancelledId)
        if (group !== undefined) {
          clientIdToGroup.delete(cancelledId)
          const idx = group.waiters.indexOf(cancelledId)
          if (idx !== -1) {
            group.waiters.splice(idx, 1)
          }
          if (group.waiters.length > 0) {
            // Another live request is still waiting on this upstream call;
            // do not cancel the upstream request.
            return
          }
          pendingByUpstreamId.delete(group.upstreamId)
          if (pendingByCacheKey.get(group.cacheKey) === group) {
            pendingByCacheKey.delete(group.cacheKey)
          }
          inner.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "$/cancelRequest",
              params: { id: group.upstreamId },
            }),
          )
          return
        }
        inner.send(message)
        return
      }

      // Serve cacheable read-only requests from LRU or coalesce in-flight calls.
      if (parsed.id !== undefined && cacheableMethods.has(method)) {
        const cacheKey = buildCacheKey(method, params)
        if (cacheKey !== undefined) {
          const cached = getLru(cacheKey)
          if (cached.found) {
            const response = JSON.stringify({
              jsonrpc: "2.0",
              id: parsed.id,
              result: cached.value,
            })
            queueMicrotask(() => {
              emitToHandlers(response)
            })
            return
          }

          const existing = pendingByCacheKey.get(cacheKey)
          if (existing !== undefined) {
            existing.waiters.push(parsed.id)
            clientIdToGroup.set(parsed.id, existing)
            return
          }

          const group: PendingGroup = {
            upstreamId: parsed.id,
            cacheKey,
            waiters: [parsed.id],
          }
          pendingByUpstreamId.set(parsed.id, group)
          pendingByCacheKey.set(cacheKey, group)
          clientIdToGroup.set(parsed.id, group)
        }
      }

      inner.send(message)
    },

    subscribe(handler: (value: string) => void) {
      handlers.add(handler)
      if (!innerSubscribed) {
        innerSubscribed = true
        inner.subscribe(handleInnerMessage)
      }
    },

    unsubscribe(handler: (value: string) => void) {
      handlers.delete(handler)
      if (handlers.size === 0 && innerSubscribed) {
        innerSubscribed = false
        inner.unsubscribe(handleInnerMessage)
        resetPending()
      }
    },
  }

  return {
    transport,
    clear: () => {
      lru.clear()
      resetPending()
    },
    resetPending,
    replayIncoming: (raw: string) => {
      emitToHandlers(raw)
    },
  }
}
