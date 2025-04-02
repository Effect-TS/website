import { defineRouteMiddleware } from "@astrojs/starlight/route-data"
import { isPodcastEntry } from "@/lib/podcast"

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals
  const { entry } = starlightRoute

  if (isPodcastEntry(entry)) {
    entry.data = {
      ...entry.data,
      pagefind: false,
      template: 'splash',
    }
    starlightRoute.hasSidebar = false
    starlightRoute.pagination = { prev: undefined, next: undefined }
    starlightRoute.toc = undefined
  }
})
