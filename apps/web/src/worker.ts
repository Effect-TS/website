import handler from "@alchemy.run/frontend-frameworks/astro/entrypoints/server"
import { DurableObject, type env as WorkerEnv } from "cloudflare:workers"
import {
  forwardToLspContainer,
  handleLspUpgrade,
  LSP_CONTAINER_PORT,
} from "./features/scratchpad/lsp-gateway.ts"

export class LspContainer extends DurableObject<typeof WorkerEnv> {
  readonly defaultPort = LSP_CONTAINER_PORT
  readonly sleepAfter = "1m"

  async fetch(request: Request): Promise<Response> {
    const container = this.ctx.container
    if (container === undefined) {
      return new Response("LSP container unavailable", { status: 503 })
    }
    return forwardToLspContainer(container, request, {
      port: this.defaultPort,
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
