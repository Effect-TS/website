import type { APIRoute } from "astro"

export const prerender = false

// Served at `/_ingest/*` (injected in astro.config.ts). The `/_` prefix is
// exempt from Astro's trailing-slash redirect (isInternalPath), so PostHog's
// trailing-slash endpoints (`/flags/`, `/e/`) proxy without a 308.
export const ALL: APIRoute = ({ params, request }) => {
  const path = params.path ?? ""
  const origin =
    path.startsWith("static/") || path.startsWith("array/")
      ? "https://us-assets.i.posthog.com"
      : "https://us.i.posthog.com"

  const requestUrl = new URL(request.url)
  const upstreamUrl = new URL(origin)
  upstreamUrl.pathname = `/${path}`
  upstreamUrl.search = requestUrl.search

  const upstreamRequest = new Request(upstreamUrl, request)
  upstreamRequest.headers.delete("host")
  return fetch(upstreamRequest)
}
