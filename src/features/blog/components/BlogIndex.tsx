import { RegistryProvider, useAtomMount, useAtomValue } from "@effect/atom-react"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { BlogCategorySummary, BlogPostSummary } from "../domain"
import { categoriesAtom, categoryUrlSyncAtom, postsAtom, twiePostsAtom } from "./BlogAtoms"
import BlogControls from "./BlogControls"
import { TWIEScrollRail } from "./TWIEScrollRail"

function BlogIndexContent() {
  // Applies the URL's `?category=` param after hydration — see the note on
  // `categoryUrlSyncAtom` for why this can't happen during the initial render.
  useAtomMount(categoryUrlSyncAtom)

  const twiePosts = useAtomValue(twiePostsAtom)

  return (
    <>
      {twiePosts.length > 0 && (
        <>
          <section className="relative">
            <div className="mx-auto w-full max-w-295 px-4">
              <TWIEScrollRail />
            </div>
          </section>
          <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
        </>
      )}

      <section id="blog-grid" className="relative">
        <div className="mx-auto w-full max-w-295 px-4">
          <BlogControls />
        </div>
      </section>
    </>
  )
}

/**
 * The single client island for the blog index. Both the "This Week in
 * Effect" rail and the filterable grid used to be separate `client:load`
 * islands, each serializing its own posts prop — the rail's ~128 TWIE posts
 * were a subset of the grid's ~171 and got shipped to the client twice. This
 * component seeds one registry with `posts` a single time and derives the
 * rail's subset client-side via `twiePostsAtom`.
 */
export function BlogIndex({
  posts,
  categories,
}: {
  readonly posts: ReadonlyArray<BlogPostSummary>
  readonly categories: ReadonlyArray<BlogCategorySummary>
}) {
  return (
    <RegistryProvider
      initialValues={[
        Atom.initialValue(posts)(postsAtom),
        Atom.initialValue(categories)(categoriesAtom),
      ]}
    >
      <BlogIndexContent />
    </RegistryProvider>
  )
}
