import { defineMiddleware } from "astro:middleware"
import { legacyApiRedirect } from "./features/api-reference/legacy-redirect"

export const onRequest = defineMiddleware(({ redirect, url }, next) => {
  const destination = legacyApiRedirect(url.pathname)
  return destination === undefined
    ? next()
    : redirect(`${destination}${url.search}`, 308)
})
