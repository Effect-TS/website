import type { RateLimitBinding } from "../motw-vote/guards.ts"

export const DEFAULT_ALLOWED_ORIGINS: ReadonlyArray<string> = [
  "https://effect.website",
  "https://www.effect.website",
]

export const LSP_CONTAINER_POOL_SIZE = 4
export const LSP_CONTAINER_PORT = 8787
export const LSP_CONTAINER_SLEEP_AFTER_MS = 60_000

export interface LspContainerStubLike {
  readonly fetch: (request: Request) => Promise<Response>
}

export interface LspContainerNamespaceLike {
  readonly idFromName: (name: string) => unknown
  readonly get: (id: unknown) => LspContainerStubLike
}

export interface LspContainerRuntimeLike {
  readonly running: boolean
  readonly start: (options?: { readonly enableInternet?: boolean }) => void
  readonly setInactivityTimeout?: (durationMs: number | bigint) => Promise<void>
  readonly getTcpPort: (port: number) => LspContainerStubLike
}

export interface LspGatewayDeps {
  readonly containerNamespace: LspContainerNamespaceLike
  readonly rateLimit: RateLimitBinding
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
  readonly allowPreviewOrigins?: boolean | undefined
  readonly poolSize?: number | undefined
}

const isWebSocketUpgrade = (request: Request): boolean =>
  request.method === "GET" &&
  request.headers.get("upgrade")?.toLowerCase() === "websocket"

const parseStrictOrigin = (value: string | null): URL | undefined => {
  if (value === null || value.length === 0 || value === "null") {
    return undefined
  }
  try {
    const parsed = new URL(value)
    if (parsed.origin !== value) {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

export const isAllowedOrigin = (
  originHeader: string | null,
  requestUrl: string,
  options?: {
    readonly allowedOrigins?: ReadonlyArray<string> | undefined
    readonly allowPreviewOrigins?: boolean | undefined
  },
): boolean => {
  const parsedOrigin = parseStrictOrigin(originHeader)
  if (parsedOrigin === undefined) {
    return false
  }

  const allowlist = options?.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS
  if (allowlist.includes(parsedOrigin.origin)) {
    return true
  }

  if (options?.allowPreviewOrigins === true) {
    try {
      const parsedRequestUrl = new URL(requestUrl)
      if (parsedOrigin.origin === parsedRequestUrl.origin) {
        const host = parsedOrigin.hostname
        if (
          (parsedOrigin.protocol === "https:" &&
            host.endsWith(".workers.dev")) ||
          (parsedOrigin.protocol === "http:" &&
            (host === "localhost" || host === "127.0.0.1"))
        ) {
          return true
        }
      }
    } catch {
      return false
    }
  }

  return false
}

export const extractClientIp = (request: Request): string => {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp !== undefined && cfIp.length > 0) {
    return cfIp
  }
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim()
    if (first !== undefined && first.length > 0) {
      return first
    }
  }
  return "unknown"
}

const fnv1a32 = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export const selectContainerInstanceName = (
  clientKey: string,
  poolSize: number = LSP_CONTAINER_POOL_SIZE,
): string => {
  const safePoolSize = Math.max(1, Math.floor(poolSize))
  const slot = fnv1a32(clientKey) % safePoolSize
  return `lsp-pool-${slot}`
}

export const handleLspUpgrade = async (
  request: Request,
  deps: LspGatewayDeps,
): Promise<Response> => {
  if (!isWebSocketUpgrade(request)) {
    return new Response("Expected WebSocket upgrade", {
      status: 426,
      headers: { Upgrade: "websocket" },
    })
  }

  if (
    !isAllowedOrigin(request.headers.get("origin"), request.url, {
      allowedOrigins: deps.allowedOrigins,
      allowPreviewOrigins: deps.allowPreviewOrigins,
    })
  ) {
    return new Response("Forbidden origin", { status: 403 })
  }

  const clientIp = extractClientIp(request)
  const { success } = await deps.rateLimit.limit({ key: clientIp })
  if (!success) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": "60" },
    })
  }

  const instanceName = selectContainerInstanceName(clientIp, deps.poolSize)
  const id = deps.containerNamespace.idFromName(instanceName)
  const stub = deps.containerNamespace.get(id)
  return stub.fetch(request)
}

export interface ForwardToContainerOptions {
  readonly port?: number | undefined
  readonly sleepAfterMs?: number | undefined
  readonly maxAttempts?: number | undefined
  readonly retryDelayMs?: number | undefined
}

const delay = (ms: number): Promise<void> =>
  ms <= 0
    ? Promise.resolve()
    : new Promise((resolve) => {
        setTimeout(resolve, ms)
      })

/**
 * Ensures the attached Cloudflare Container is running with a 1-minute
 * inactivity timeout, then forwards the WebSocket upgrade request to the
 * bridge's TCP port via `getTcpPort(port).fetch(request)`.
 */
export const forwardToLspContainer = async (
  container: LspContainerRuntimeLike,
  request: Request,
  options?: ForwardToContainerOptions,
): Promise<Response> => {
  const port = options?.port ?? LSP_CONTAINER_PORT
  const sleepAfterMs = options?.sleepAfterMs ?? LSP_CONTAINER_SLEEP_AFTER_MS
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 20)
  const retryDelayMs = options?.retryDelayMs ?? 150

  if (!container.running) {
    container.start({ enableInternet: false })
  }

  if (container.setInactivityTimeout !== undefined) {
    try {
      await container.setInactivityTimeout(sleepAfterMs)
    } catch {
      // Some local/runtime shims do not implement setInactivityTimeout.
    }
  }

  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await container.getTcpPort(port).fetch(request)
    } catch (error) {
      lastError = error
      if (attempt + 1 < maxAttempts) {
        await delay(retryDelayMs)
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to reach LSP container port ${port}`)
}
