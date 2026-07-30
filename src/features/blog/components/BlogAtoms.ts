import * as Atom from "effect/unstable/reactivity/Atom"
import {
  AllCategoryParam,
  BlogCategory,
  blogCategoryFromParam,
  blogCategoryLabel,
  blogCategoryToParam,
  type BlogCategorySummary,
  type BlogPostSummary,
  type BlogSortOrder,
  selectPostsForCategory,
  sortBlogSummariesByDate,
} from "../domain"

const BLOG_POSTS_PER_PAGE = 12

export function blogTotalPages(postCount: number, perPage: number = BLOG_POSTS_PER_PAGE): number {
  return Math.max(1, Math.ceil(postCount / perPage))
}

export function blogPageSlice<T>(
  posts: ReadonlyArray<T>,
  page: number,
  perPage: number = BLOG_POSTS_PER_PAGE,
): ReadonlyArray<T> {
  const totalPages = blogTotalPages(posts.length, perPage)
  const safePage = Math.min(Math.max(1, page), totalPages)
  return posts.slice((safePage - 1) * perPage, safePage * perPage)
}

export function blogPaginationWindow(
  currentPage: number,
  totalPages: number,
): ReadonlyArray<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: Array<number | "ellipsis"> = [1]
  if (currentPage > 3) {
    items.push("ellipsis")
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page++) {
    items.push(page)
  }

  if (currentPage < totalPages - 2) {
    items.push("ellipsis")
  }
  items.push(totalPages)

  return items
}

export function applyCategoryToUrl(url: URL, category: BlogCategory): URL {
  const next = new URL(url)
  const param = blogCategoryToParam(category)
  if (param === undefined) {
    next.searchParams.delete("category")
  } else {
    next.searchParams.set("category", param)
  }
  return next
}

// =============================================================================
// Seeded from the index props
// =============================================================================

export const postsAtom = Atom.make<ReadonlyArray<BlogPostSummary>>([]).pipe(
  Atom.withLabel("blog:posts"),
)
export const categoriesAtom = Atom.make<ReadonlyArray<BlogCategorySummary>>([]).pipe(
  Atom.withLabel("blog:categories"),
)

// =============================================================================
// User state
// =============================================================================

/**
 * Starts at the pure `AllPosts` constant, identical on the server and
 * during the client's hydration render. The real category (if the URL has
 * `?category=`) is applied a commit later by `categoryUrlSyncAtom`, which
 * only runs client-side after hydration — so the hydration render never
 * disagrees with the server-rendered HTML.
 */
const activeCategoryAtom = Atom.make<BlogCategory>(BlogCategory.AllPosts()).pipe(
  Atom.withLabel("blog:active-category"),
)
export const sortOrderAtom = Atom.make<BlogSortOrder>("newest").pipe(
  Atom.withLabel("blog:sort-order"),
)
export const currentPageAtom = Atom.make(1).pipe(Atom.withLabel("blog:current-page"))
export const categoryMenuOpenAtom = Atom.make(false).pipe(Atom.withLabel("blog:category-menu-open"))

// =============================================================================
// Derived
// =============================================================================

export const twiePostsAtom = Atom.make((get) =>
  selectPostsForCategory(get(postsAtom), BlogCategory.ThisWeekInEffect()),
).pipe(Atom.withLabel("blog:twie-posts"))

const filteredPostsAtom = Atom.make((get) =>
  sortBlogSummariesByDate(
    selectPostsForCategory(get(postsAtom), get(activeCategoryAtom)),
    get(sortOrderAtom),
  ),
).pipe(Atom.withLabel("blog:filtered-posts"))

export const totalPagesAtom = Atom.make((get) =>
  blogTotalPages(get(filteredPostsAtom).length),
).pipe(Atom.withLabel("blog:total-pages"))

const safePageAtom = Atom.make((get) => Math.min(get(currentPageAtom), get(totalPagesAtom))).pipe(
  Atom.withLabel("blog:safe-page"),
)

export const paginatedPostsAtom = Atom.make((get) =>
  blogPageSlice(get(filteredPostsAtom), get(safePageAtom)),
).pipe(Atom.withLabel("blog:paginated-posts"))

export const pageWindowAtom = Atom.make((get) =>
  blogPaginationWindow(get(safePageAtom), get(totalPagesAtom)),
).pipe(Atom.withLabel("blog:page-window"))

export const activeCategoryParamAtom = Atom.make(
  (get) => blogCategoryToParam(get(activeCategoryAtom)) ?? AllCategoryParam,
).pipe(Atom.withLabel("blog:active-category-param"))

export const activeCategoryLabelAtom = Atom.make((get) =>
  blogCategoryLabel(get(activeCategoryAtom), get(categoriesAtom)),
).pipe(Atom.withLabel("blog:active-category-label"))

// =============================================================================
// Commands
// =============================================================================

function pushCategoryToLocation(category: BlogCategory): void {
  if (typeof window === "undefined") {
    return
  }
  const next = applyCategoryToUrl(new URL(window.location.href), category)
  window.history.pushState(null, "", next)
}

const BLOG_GRID_ELEMENT_ID = "blog-grid"
const BLOG_GRID_NAVBAR_HEIGHT = 64

/** Scrolls the `#blog-grid` section into view, unless it's already visible below the navbar. */
export function scrollToBlogGrid(): void {
  if (typeof window === "undefined") {
    return
  }
  const element = document.getElementById(BLOG_GRID_ELEMENT_ID)
  if (!element) {
    return
  }
  const { top } = element.getBoundingClientRect()
  if (top < BLOG_GRID_NAVBAR_HEIGHT) {
    window.scrollTo({ top: top + window.scrollY - BLOG_GRID_NAVBAR_HEIGHT, behavior: "smooth" })
  }
}

/**
 * Selecting a category resets pagination and syncs the URL — the DOM side
 * effect lives here, in the one place that writes the category, instead of
 * being reimplemented at every call site.
 */
export const selectCategoryAtom = Atom.writable(
  (get) => get(activeCategoryAtom),
  (ctx, category: BlogCategory) => {
    ctx.set(activeCategoryAtom, category)
    ctx.set(currentPageAtom, 1)
    pushCategoryToLocation(category)
  },
).pipe(Atom.withLabel("blog:select-category"))

/**
 * Applies the URL's `?category=` param to `activeCategoryAtom` and keeps it
 * in sync with back/forward navigation. Mounted once from the index root
 * via `useAtomMount`, which runs inside a React effect — strictly after the
 * hydration render has already committed using the pure `AllPosts` value
 * above.
 */
export const categoryUrlSyncAtom = Atom.make((get) => {
  if (typeof window === "undefined") {
    return
  }
  const readFromUrl = () => {
    const param = new URLSearchParams(window.location.search).get("category")
    const validTagIds = get(categoriesAtom).map((category) => category.id)
    get.set(activeCategoryAtom, blogCategoryFromParam(param, validTagIds))
  }
  readFromUrl()
  window.addEventListener("popstate", readFromUrl)
  get.addFinalizer(() => window.removeEventListener("popstate", readFromUrl))
}).pipe(Atom.withLabel("blog:category-url-sync"))
