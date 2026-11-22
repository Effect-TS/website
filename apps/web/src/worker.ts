import handler from "@alchemy.run/frontend-frameworks/astro/entrypoints/server"
import { DurableObject, type env as WorkerEnv } from "cloudflare:workers"
import {
  forwardToLspContainer,
  handleLspUpgrade,
  LSP_CONTAINER_PORT,
  LSP_CONTAINER_SLEEP_AFTER_MS,
} from "./features/scratchpad/lsp-gateway.ts"

export class LspContainer extends DurableObject<typeof WorkerEnv> {
  readonly defaultPort = LSP_CONTAINER_PORT
  // Container inactivity timeout pairs with BridgeServer's 1-minute real-LSP-frame
  // idle eviction (close code 4000), allowing idle containers to scale to zero.
  readonly sleepAfterMs = LSP_CONTAINER_SLEEP_AFTER_MS

  async fetch(request: Request): Promise<Response> {
    const container = this.ctx.container
    if (container === undefined) {
      return new Response("LSP container unavailable", { status: 503 })
    }
    return forwardToLspContainer(container, request, {
      port: this.defaultPort,
      sleepAfterMs: this.sleepAfterMs,
    })
  }
}

export default {
  async fetch(
    request: Request,
    env: typeof WorkerEnv,
    ctx: Parameters<typeof handler.fetch>[2],
  ): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === "/api/lsp") {
      return handleLspUpgrade(request, {
        containerNamespace: env.LSP_CONTAINER,
        rateLimit: env.LSP_RATE_LIMIT,
        allowPreviewOrigins: env.LSP_ALLOW_PREVIEW_ORIGINS === "true",
      })
    }
    return handler.fetch(
      request as Parameters<typeof handler.fetch>[0],
      env as Parameters<typeof handler.fetch>[1],
      ctx,
    )
  },
}
