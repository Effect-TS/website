declare module "cloudflare:workers" {
  export const env: {
    readonly ASSETS: {
      readonly fetch: (request: Request) => Promise<Response>
    }
  }
}
