import type { APIRoute } from "astro"

export const prerender = false

export const ALL: APIRoute = ({ url }) => {
  const destination = new URL(url)
  destination.pathname = `/docs/v4/api${url.pathname.slice("/docs/api/v4".length)}`
  return Response.redirect(destination, 308)
}
