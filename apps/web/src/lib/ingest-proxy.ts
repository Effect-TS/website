import type { APIRoute } from "astro"

export const prerender = false

const MAPLE_INGEST = "https://ingest.maple.dev"

/**
 * The Maple ingest request for a browser request to `/_ingest/<path>`, or
 * `undefined` for a path Maple's browser SDK never sends to.
 *
 * Maple sees our Worker as the client, so the visitor's address goes in
 * `X-Forwarded-For`, the first header Maple reads for it. Cloudflare sets
 * `CF-Connecting-IP` itself, so a visitor cannot choose the address Maple
 * gets. Cookies for effect.website stay here.
 */
export function toMapleRequest(
  request: Request,
  path: string,
): Request | undefined {
  if (!path.startsWith("v1/")) return undefined

  const upstreamUrl = new URL(MAPLE_INGEST)
  upstreamUrl.pathname = `/${path}`
  upstreamUrl.search = new URL(request.url).search

  const upstream = new Request(upstreamUrl, request)
  upstream.headers.delete("host")
  upstream.headers.delete("cookie")
  const visitorIp = request.headers.get("cf-connecting-ip")
  if (visitorIp === null) upstream.headers.delete("x-forwarded-for")
  else upstream.headers.set("x-forwarded-for", visitorIp)
  return upstream
}

// Served at `/_ingest/*` (injected in astro.config.ts), so analytics requests
// stay on effect.website.
export const ALL: APIRoute = async ({ params, request }) => {
  const upstream = toMapleRequest(request, params.path ?? "")
  if (upstream === undefined) return new Response(null, { status: 404 })

  const response = await fetch(upstream)
  // Maple has no reason to set cookies on effect.website.
  const headers = new Headers(response.headers)
  headers.delete("set-cookie")
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
