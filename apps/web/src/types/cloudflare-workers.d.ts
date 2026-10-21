declare module "cloudflare:workers" {
  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
    /** Module of the Week votes. Bound when deployed. */
    readonly DB?: import("@/features/module-requests/d1").D1Database
    /** Rate limit for votes. Bound when deployed. */
    readonly MODULE_VOTES_LIMIT?: {
      readonly limit: (options: {
        readonly key: string
      }) => Promise<{ readonly success: boolean }>
    }
    /** Signs the voter cookie. */
    readonly MODULE_VOTES_SECRET?: string
    /** The Turnstile keys of the human check that votes need. */
    readonly TURNSTILE_SITE_KEY?: string
    readonly TURNSTILE_SECRET?: string
  }
}
