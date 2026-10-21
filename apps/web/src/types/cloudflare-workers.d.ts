declare module "cloudflare:workers" {
  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
    /** Module of the Week votes. Bound when deployed. */
    readonly DB?: import("@effect/sql-d1/D1Client").D1ClientConfig["db"]
  }
}
