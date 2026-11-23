declare module "cloudflare:workers" {
  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
    /** Module of the Week votes. */
    readonly DB: import("@effect/sql-d1/D1Client").D1ClientConfig["db"]
    /** Limits how fast one client can vote. */
    readonly MOTW_VOTE_LIMIT: import("@/features/motw-vote/guards").RateLimitBinding
  }
}
