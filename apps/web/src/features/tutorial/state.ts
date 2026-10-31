import * as Atom from "effect/reactivity/Atom"
import type { Status } from "./components/Results"
import { lessonHref, slugOf } from "./router"

/**
 * State shared by the tutorial islands. They hydrate separately but live in
 * one page, so they share these atoms.
 */

/** The lesson shown, kept in sync with the URL (History API). */
export const slugAtom = Atom.writable(
  (get) => {
    const onPop = () => get.setSelf(slugOf(window.location.pathname))
    window.addEventListener("popstate", onPop)
    get.addFinalizer(() => window.removeEventListener("popstate", onPop))
    return slugOf(window.location.pathname)
  },
  (ctx, slug: string) => ctx.setSelf(slug),
)

export const navigateAtom = Atom.fnSync<{
  readonly slug: string
  readonly replace?: boolean
}>()(({ slug, replace }, get) => {
  if (slug === slugOf(window.location.pathname)) return
  const url = lessonHref(slug)
  if (replace) window.history.replaceState(null, "", url)
  else window.history.pushState(null, "", url)
  get.set(slugAtom, slug)
})

/** Result of the latest check of the learner's code. */
export const statusAtom = Atom.make<Status>({ _tag: "Loading" })

/** Boot steps done: editor, types, first check. Only grows. */
export const bootedAtom = Atom.make(0)

export const reportBootAtom = Atom.fnSync<number>()((done, get) => {
  if (done > get(bootedAtom)) get.set(bootedAtom, done)
})

/** What the header can do to the editor. `null` until a lesson is mounted. */
export interface EditorActions {
  readonly reset: () => void
  readonly solve: () => void
}

export const editorActionsAtom = Atom.make<EditorActions | null>(null)
