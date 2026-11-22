import { describe, expect, it } from "vite-plus/test"
import {
  forwardToLspContainer,
  handleLspUpgrade,
  LSP_CONTAINER_PORT,
  LSP_CONTAINER_SLEEP_AFTER_MS,
  type LspContainerNamespaceLike,
  type LspContainerRuntimeLike,
  type LspGatewayDeps,
} from "../../../src/features/scratchpad/lsp-gateway.ts"

interface MockGatewayHarness {
  readonly deps: LspGatewayDeps
  readonly rateLimitKeys: Array<string>
  readonly routedInstances: Array<string>
  readonly forwardedRequests: Array<Request>
}

const makeHarness = (options?: {
  readonly rateLimitAllowed?: boolean
  readonly allowedOrigins?: ReadonlyArray<string>
  readonly allowPreviewOrigins?: boolean
  readonly poolSize?: number
  readonly upstreamResponse?: Response
}): MockGatewayHarness => {
  const rateLimitKeys: Array<string> = []
  const routedInstances: Array<string> = []
  const forwardedRequests: Array<Request> = []

  const containerNamespace: LspContainerNamespaceLike = {
    idFromName: (name) => ({ name }),
    get: (id) => ({
      fetch: async (request) => {
        routedInstances.push((id as { readonly name: string }).name)
        forwardedRequests.push(request)
        return (
          options?.upstreamResponse ?? new Response("upgraded", { status: 200 })
        )
      },
    }),
  }

  return {
    rateLimitKeys,
    routedInstances,
    forwardedRequests,
    deps: {
      containerNamespace,
      rateLimit: {
        limit: async ({ key }) => {
          rateLimitKeys.push(key)
          return { success: options?.rateLimitAllowed ?? true }
        },
      },
      allowedOrigins: options?.allowedOrigins,
      allowPreviewOrigins: options?.allowPreviewOrigins,
      poolSize: options?.poolSize,
    },
  }
}

describe("LSP WebSocket gateway (/api/lsp)", () => {
  it("rejects non-WebSocket requests with 426 Upgrade Required without hitting rate limit or containers", async () => {
    const harness = makeHarness()
    const request = new Request("https://effect.website/api/lsp", {
      method: "GET",
      headers: {
        Origin: "https://effect.website",
        "cf-connecting-ip": "203.0.113.10",
      },
    })

    const response = await handleLspUpgrade(request, harness.deps)

    expect(response.status).toBe(426)
    expect(response.headers.get("upgrade")).toBe("websocket")
    expect(harness.rateLimitKeys).toEqual([])
    expect(harness.routedInstances).toEqual([])
  })

  it("rejects POST requests even with Upgrade: websocket header", async () => {
    const harness = makeHarness()
    const request = new Request("https://effect.website/api/lsp", {
      method: "POST",
      headers: {
        Upgrade: "websocket",
        Origin: "https://effect.website",
        "cf-connecting-ip": "203.0.113.10",
      },
    })

    const response = await handleLspUpgrade(request, harness.deps)

    expect(response.status).toBe(426)
    expect(harness.rateLimitKeys).toEqual([])
  })

  it("rejects missing, malformed, and disallowed Origin headers with 403 Forbidden", async () => {
    const invalidOrigins: ReadonlyArray<string | undefined> = [
      undefined,
      "",
      "null",
      "not-a-url",
      "https://evil.example",
      "https://effect.website.evil.com",
      "http://effect.website",
      "https://effect-pr-42.example.workers.dev",
    ]

    for (const origin of invalidOrigins) {
      const harness = makeHarness()
      const headers = new Headers({
        Upgrade: "websocket",
        "cf-connecting-ip": "203.0.113.10",
      })
      if (origin !== undefined) {
        headers.set("Origin", origin)
      }

      const request = new Request("https://effect.website/api/lsp", {
        method: "GET",
        headers,
      })

      const response = await handleLspUpgrade(request, harness.deps)

      expect(response.status, `origin=${String(origin)}`).toBe(403)
      expect(harness.rateLimitKeys).toEqual([])
      expect(harness.routedInstances).toEqual([])
    }
  })

  it("accepts allowlisted production origins and preview origins when enabled", async () => {
    const prodHarness = makeHarness()
    const prodResponse = await handleLspUpgrade(
      new Request("https://effect.website/api/lsp", {
        method: "GET",
        headers: {
          Upgrade: "websocket",
          Origin: "https://effect.website",
          "cf-connecting-ip": "203.0.113.10",
        },
      }),
      prodHarness.deps,
    )
    expect(prodResponse.status).toBe(200)
    expect(prodHarness.routedInstances).toHaveLength(1)

    const wwwHarness = makeHarness()
    const wwwResponse = await handleLspUpgrade(
      new Request("https://effect.website/api/lsp", {
        method: "GET",
        headers: {
          Upgrade: "websocket",
          Origin: "https://www.effect.website",
          "cf-connecting-ip": "203.0.113.10",
        },
      }),
      wwwHarness.deps,
    )
    expect(wwwResponse.status).toBe(200)
    expect(wwwHarness.routedInstances).toHaveLength(1)

    const previewHarness = makeHarness({ allowPreviewOrigins: true })
    const previewResponse = await handleLspUpgrade(
      new Request("https://effect-website-pr-99.effect.workers.dev/api/lsp", {
        method: "GET",
        headers: {
          Upgrade: "websocket",
          Origin: "https://effect-website-pr-99.effect.workers.dev",
          "cf-connecting-ip": "203.0.113.10",
        },
      }),
      previewHarness.deps,
    )
    expect(previewResponse.status).toBe(200)

    const crossPreviewResponse = await handleLspUpgrade(
      new Request("https://effect-website-pr-99.effect.workers.dev/api/lsp", {
        method: "GET",
        headers: {
          Upgrade: "websocket",
          Origin: "https://attacker.workers.dev",
          "cf-connecting-ip": "203.0.113.10",
        },
      }),
      previewHarness.deps,
    )
    expect(crossPreviewResponse.status).toBe(403)
  })

  it("enforces per-IP rate limiting and rejects exceeded clients with 429 Too Many Requests", async () => {
    const harness = makeHarness({ rateLimitAllowed: false })
    const request = new Request("https://effect.website/api/lsp", {
      method: "GET",
      headers: {
        Upgrade: "websocket",
        Origin: "https://effect.website",
        "cf-connecting-ip": "198.51.100.42",
      },
    })

    const response = await handleLspUpgrade(request, harness.deps)

    expect(response.status).toBe(429)
    expect(response.headers.get("retry-after")).toBe("60")
    expect(harness.rateLimitKeys).toEqual(["198.51.100.42"])
    expect(harness.routedInstances).toEqual([])
  })

  it("routes requests deterministically by client IP hash across the 4-instance container pool", async () => {
    const harness = makeHarness()

    const sendForIp = (ip: string) =>
      handleLspUpgrade(
        new Request("https://effect.website/api/lsp", {
          method: "GET",
          headers: {
            Upgrade: "websocket",
            Origin: "https://effect.website",
            "cf-connecting-ip": ip,
          },
        }),
        harness.deps,
      )

    // Same IP always lands on the exact same named pool instance
    await sendForIp("203.0.113.10")
    await sendForIp("203.0.113.10")
    expect(harness.routedInstances[0]).toBe(harness.routedInstances[1])
    expect(harness.routedInstances[0]).toMatch(/^lsp-pool-[0-3]$/)

    // Distinct IPs distribute across all 4 pool slots
    const seen = new Set<string>()
    for (let i = 1; i <= 40; i++) {
      const h = makeHarness()
      const res = await handleLspUpgrade(
        new Request("https://effect.website/api/lsp", {
          method: "GET",
          headers: {
            Upgrade: "websocket",
            Origin: "https://effect.website",
            "cf-connecting-ip": `198.51.100.${i}`,
          },
        }),
        h.deps,
      )
      expect(res.status).toBe(200)
      seen.add(h.routedInstances[0]!)
    }

    expect([...seen].sort()).toEqual([
      "lsp-pool-0",
      "lsp-pool-1",
      "lsp-pool-2",
      "lsp-pool-3",
    ])
  })

  it("starts a stopped container, applies 1-minute inactivity timeout, and forwards via getTcpPort(port).fetch", async () => {
    let running = false
    let startCalls = 0
    let inactivityTimeoutMs: number | bigint | undefined
    const requestedPorts: Array<number> = []
    let fetchAttempts = 0

    const container: LspContainerRuntimeLike = {
      get running() {
        return running
      },
      start: () => {
        startCalls += 1
        running = true
      },
      setInactivityTimeout: async (durationMs) => {
        inactivityTimeoutMs = durationMs
      },
      getTcpPort: (port) => ({
        fetch: async () => {
          requestedPorts.push(port)
          fetchAttempts += 1
          if (fetchAttempts === 1) {
            throw new Error("connection refused while booting")
          }
          return new Response("ok", { status: 200 })
        },
      }),
    }

    const request = new Request("https://effect.website/api/lsp", {
      method: "GET",
      headers: { Upgrade: "websocket" },
    })

    const response = await forwardToLspContainer(container, request, {
      retryDelayMs: 0,
      maxAttempts: 3,
    })

    expect(response.status).toBe(200)
    expect(startCalls).toBe(1)
    expect(inactivityTimeoutMs).toBe(LSP_CONTAINER_SLEEP_AFTER_MS)
    expect(LSP_CONTAINER_SLEEP_AFTER_MS).toBe(60_000)
    expect(requestedPorts).toEqual([LSP_CONTAINER_PORT, LSP_CONTAINER_PORT])
  })
})
