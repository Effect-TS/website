declare module "cloudflare:workers" {
  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
    /** Module of the Week votes. */
    readonly DB: import("@effect/sql-d1/D1Client").D1ClientConfig["db"]
    /** Limits how fast one client can vote. */
    readonly MOTW_VOTE_LIMIT: import("@/features/motw-vote/guards").RateLimitBinding
    /** Maple server telemetry. Unset outside deployed stages with a key. */
    readonly MAPLE_INGEST_KEY?: string
    readonly MAPLE_ENVIRONMENT?: string
    readonly COMMIT_SHA?: string
  }
  /** Keeps the Worker alive until the promise settles, after the response. */
  export function waitUntil(promise: Promise<unknown>): void
}
