import type { APIRoute } from "astro"

import type { DocsVersion } from "@/lib/versions"

/**
 * The API reference used to live under `/docs/api/<version>`, and links to it
 * still circulate. Each one redirects to the same page under
 * `/docs/<version>/api`.
 */
export const legacyApiRedirect =
  (version: DocsVersion): APIRoute =>
  ({ url }) => {
    const destination = new URL(url)
    destination.pathname = `/docs/${version}/api${url.pathname.slice(`/docs/api/${version}`.length)}`
    return Response.redirect(destination, 308)
  }
