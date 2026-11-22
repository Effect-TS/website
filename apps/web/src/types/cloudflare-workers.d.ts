declare module "cloudflare:workers" {
  export interface DurableObjectState {
    readonly container?: import("@/features/scratchpad/lsp-gateway").LspContainerRuntimeLike
  }

  export class DurableObject<Env = typeof env> {
    protected readonly ctx: DurableObjectState
    protected readonly env: Env
    constructor(ctx: DurableObjectState, env: Env)
  }

  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
    /** Module of the Week votes. */
    readonly DB: import("@effect/sql-d1/D1Client").D1ClientConfig["db"]
    /** Limits how fast one client can vote. */
    readonly MOTW_VOTE_LIMIT: import("@/features/motw-vote/guards").RateLimitBinding
    /** Pool of Cloudflare Container Durable Objects running `@website/lsp-bridge`. */
    readonly LSP_CONTAINER: import("@/features/scratchpad/lsp-gateway").LspContainerNamespaceLike
    /** Per-IP rate limiter for `/api/lsp` WebSocket upgrades. */
    readonly LSP_RATE_LIMIT: import("@/features/motw-vote/guards").RateLimitBinding
    /** `"true"` on preview/dev stages to allow same-origin `*.workers.dev` and `localhost` origins. */
    readonly LSP_ALLOW_PREVIEW_ORIGINS?: string | undefined
  }
}
