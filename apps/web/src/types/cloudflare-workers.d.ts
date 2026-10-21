declare module "cloudflare:workers" {
  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
    /** Module of the Week votes. Bound when deployed, absent in `astro dev`. */
    readonly DB?: import("@/features/module-requests/d1").D1Database
    /** Rate limit for votes. Bound when deployed, absent in `astro dev`. */
    readonly MODULE_VOTES_LIMIT?: {
      readonly limit: (options: {
        readonly key: string
      }) => Promise<{ readonly success: boolean }>
    }
  }
}
