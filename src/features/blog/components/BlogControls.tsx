import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react"
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, FileSearch, Rss } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"
import { blogCategoryFromParam, SuggestedCategoryIds } from "../domain"
import {
  activeCategoryLabelAtom,
  activeCategoryParamAtom,
  categoriesAtom,
  categoryMenuOpenAtom,
  currentPageAtom,
  pageWindowAtom,
  paginatedPostsAtom,
  scrollToBlogGrid,
  selectCategoryAtom,
  sortOrderAtom,
  totalPagesAtom,
} from "./BlogAtoms"
import { PostCard } from "./PostCard"

export default function BlogControls() {
  const categories = useAtomValue(categoriesAtom)
  const selectCategory = useAtomSet(selectCategoryAtom)
  const activeCategoryParam = useAtomValue(activeCategoryParamAtom)
  const activeCategoryLabel = useAtomValue(activeCategoryLabelAtom)
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom)
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom)
  const [categoryOpen, setCategoryOpen] = useAtom(categoryMenuOpenAtom)
  const totalPages = useAtomValue(totalPagesAtom)
  const paginatedPosts = useAtomValue(paginatedPostsAtom)
  const pageItems = useAtomValue(pageWindowAtom)

  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const validTagIds = categories.map((category) => category.id)

  useEffect(() => {
    if (!categoryOpen) {
      return
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryDropdownRef.current?.contains(event.target as Node)) {
        setCategoryOpen(false)
      }
    }
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoryOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleEscapeKey)
    return () => {
      window.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleEscapeKey)
    }
  }, [categoryOpen, setCategoryOpen])

  const handleTagChange = useCallback(
    (tagId: string) => {
      selectCategory(blogCategoryFromParam(tagId, validTagIds))
      scrollToBlogGrid()
    },
    [selectCategory, validTagIds],
  )

  const clearFilters = useCallback(() => {
    selectCategory(blogCategoryFromParam(null, validTagIds))
  }, [selectCategory, validTagIds])

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page)
      scrollToBlogGrid()
    },
    [setCurrentPage],
  )

  return (
    <div className="min-w-0 pb-24">
      <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-300/80 pb-4 md:mt-20 dark:border-zinc-700/80">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {activeCategoryParam === "all" ? "Other posts" : activeCategoryLabel}
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 sm:gap-x-6">
          <div ref={categoryDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setCategoryOpen((isOpen) => !isOpen)}
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              className="group inline-flex items-baseline gap-1.5 font-mono text-sm transition-colors"
            >
              <span className="text-zinc-800 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
                {activeCategoryParam === "all" ? "Category" : activeCategoryLabel}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 self-center text-zinc-400 transition-transform group-hover:text-zinc-300 ${
                  categoryOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {categoryOpen && (
              <ul
                role="listbox"
                className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-zinc-300 bg-white py-2 shadow-lg shadow-black/40 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {categories.map((category) => {
                  const isActive = activeCategoryParam === category.id
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          handleTagChange(category.id)
                          setCategoryOpen(false)
                        }}
                        className={`group/item relative flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left font-mono text-sm transition-colors ${
                          isActive
                            ? "text-zinc-900 dark:text-white"
                            : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                        }`}
                      >
                        <span>{category.id === "all" ? "Reset category" : category.name}</span>
                        <span
                          className={`tabular-nums ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}
                        >
                          {String(category.count).padStart(3, "0")}
                        </span>
                        <span
                          className={`pointer-events-none absolute right-4 bottom-1 left-4 h-px origin-left bg-zinc-900 transition-transform duration-300 ease-out dark:bg-white ${
                            isActive ? "scale-x-100" : "scale-x-0 group-hover/item:scale-x-[0.08]"
                          }`}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setSortOrder((previous) => (previous === "newest" ? "oldest" : "newest"))
            }
            aria-label={`Sort: ${sortOrder === "newest" ? "Newest" : "Oldest"} first. Click to toggle.`}
            className="group inline-flex items-baseline gap-1.5 font-mono text-sm transition-colors"
          >
            <span className="text-zinc-800 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </span>
            <ArrowUpDown
              aria-hidden="true"
              className="h-3.5 w-3.5 self-center text-zinc-400 group-hover:text-zinc-300"
            />
          </button>
          <a
            href="/rss.xml"
            aria-label="RSS feed"
            className="group inline-flex items-baseline gap-1.5 font-mono text-sm text-zinc-800 transition-colors hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
          >
            <span>RSS</span>
            <Rss
              aria-hidden="true"
              className="h-3.5 w-3.5 self-center text-zinc-400 group-hover:text-zinc-300"
            />
          </a>
        </div>
      </div>

      {paginatedPosts.length > 0 ? (
        <>
          <div className="flex flex-col">
            {paginatedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {totalPages > 1 && (
            <>
              <div className="mt-12 h-px bg-zinc-200 dark:bg-zinc-800" />
              <nav
                aria-label="Blog pagination"
                className="mt-8 flex items-center justify-center gap-1"
              >
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>

                {pageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1.5 font-mono text-xs text-zinc-400"
                    >
                      ⋯
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={`group/page relative flex h-8 min-w-8 items-center justify-center px-2 font-mono text-xs tabular-nums transition-colors ${
                        item === currentPage
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      <span className={item === currentPage ? "font-semibold" : ""}>
                        {String(item).padStart(2, "0")}
                      </span>
                      <span
                        className={`pointer-events-none absolute right-2 -bottom-0.5 left-2 h-px origin-left bg-zinc-900 transition-transform duration-300 ease-out dark:bg-white ${
                          item === currentPage
                            ? "scale-x-100"
                            : "scale-x-0 group-hover/page:scale-x-[0.2]"
                        }`}
                      />
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </nav>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/60">
            <FileSearch aria-hidden="true" className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>
          <p className="mt-6 text-base font-medium text-zinc-700 dark:text-zinc-300">
            No posts found
          </p>
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            No posts match the current filters.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {SuggestedCategoryIds.map((suggestedId) => {
              const suggested = categories.find((category) => category.id === suggestedId)
              if (!suggested) {
                return null
              }
              return (
                <button
                  key={suggested.id}
                  type="button"
                  onClick={() => handleTagChange(suggested.id)}
                  className="inline-flex items-center rounded-md border border-zinc-200 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-600 uppercase transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white"
                >
                  {suggested.name}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-md border border-zinc-300 px-4 py-2 font-mono text-xs tracking-wider text-zinc-700 uppercase transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
