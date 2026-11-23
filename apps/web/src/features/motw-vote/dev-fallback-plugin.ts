import type { Plugin } from "vite"

const FALLBACK = "\0cloudflare-workers-fallback"

/**
 * `astro dev` has no `cloudflare:workers` module: only a deployed Worker, or
 * `alchemy dev`, provides it. This gives it an empty `env`, so server code that
 * imports it loads and falls back to its development defaults. It runs after
 * every other resolver, so a real module always wins.
 */
export const cloudflareWorkersFallback = (): Plugin => ({
  name: "cloudflare-workers-fallback",
  apply: "serve",
  enforce: "post",
  resolveId: (id) => (id === "cloudflare:workers" ? FALLBACK : undefined),
  load: (id) => (id === FALLBACK ? "export const env = {}" : undefined),
})
