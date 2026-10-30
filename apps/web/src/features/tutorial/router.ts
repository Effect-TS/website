import { useCallback, useEffect, useState } from "react"

const PREFIX = "/tutorial/"

export const lessonHref = (slug: string): string => `${PREFIX}${slug}`

const slugOf = (pathname: string): string =>
  pathname.startsWith(PREFIX)
    ? pathname.slice(PREFIX.length).replace(/\/$/, "")
    : ""

/** Client-side routing for `/tutorial/<chapter>/<lesson>` with the History API. */
export function useLessonRoute(initial: string) {
  const [slug, setSlug] = useState(initial)

  useEffect(() => {
    const onPop = () => setSlug(slugOf(window.location.pathname))
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const navigate = useCallback(
    (next: string, options?: { readonly replace?: boolean }) => {
      if (next === slugOf(window.location.pathname)) return
      const url = lessonHref(next)
      if (options?.replace) window.history.replaceState(null, "", url)
      else window.history.pushState(null, "", url)
      setSlug(next)
    },
    [],
  )

  return { slug, navigate }
}
