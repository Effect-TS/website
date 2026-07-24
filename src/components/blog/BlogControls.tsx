import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, FileSearch, Rss } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PostCard, type SerializedPost, type SerializedTag } from "./PostCard"

const POSTS_PER_PAGE = 12

const NAVBAR_HEIGHT = 64

type SortOrder = "newest" | "oldest"

function readCategoryFromUrl(tags: SerializedTag[]): string {
  if (typeof window === "undefined") return "all"
  const param = new URLSearchParams(window.location.search).get("category")
  if (param && tags.some((tag) => tag.id === param)) return param
  return "all"
}

export default function BlogControls({
  posts,
  tags,
}: {
  posts: SerializedPost[]
  tags: SerializedTag[]
}) {
  const [activeTagId, setActiveTagId] = useState<string>(() => readCategoryFromUrl(tags))
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [categoryOpen, setCategoryOpen] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  const activeTagName = useMemo(
    () => tags.find((tag) => tag.id === activeTagId)?.name ?? "All",
    [tags, activeTagId],
  )

  const sortedTags = useMemo(
    () =>
      [...tags].sort((tagA, tagB) => {
        if (tagA.id === "all") return -1
        if (tagB.id === "all") return 1
        return tagB.count - tagA.count
      }),
    [tags],
  )

  const filteredPosts = useMemo(() => {
    const filteredByCategory =
      activeTagId === "all"
        ? posts
        : posts.filter((post) => post.tags.some((tag) => tag.id === activeTagId))
    return [...filteredByCategory].sort((postA, postB) => {
      const comparison = postA.dateMs - postB.dateMs
      return sortOrder === "newest" ? -comparison : comparison
    })
  }, [posts, activeTagId, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedPosts = useMemo(
    () => filteredPosts.slice((safePage - 1) * POSTS_PER_PAGE, safePage * POSTS_PER_PAGE),
    [filteredPosts, safePage],
  )

  useEffect(() => {
    if (!categoryOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryDropdownRef.current?.contains(event.target as Node)) setCategoryOpen(false)
    }
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoryOpen(false)
    }
    window.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleEscapeKey)
    return () => {
      window.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleEscapeKey)
    }
  }, [categoryOpen])

  const syncUrl = useCallback((tagId: string) => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (tagId === "all") url.searchParams.delete("category")
    else url.searchParams.set("category", tagId)
    window.history.pushState({ category: tagId }, "", url)
  }, [])

  const maybeScrollToGrid = useCallback(() => {
    const element = gridRef.current
    if (!element) return
    const { top } = element.getBoundingClientRect()
    if (top < NAVBAR_HEIGHT) {
      window.scrollTo({ top: top + window.scrollY - NAVBAR_HEIGHT, behavior: "smooth" })
    }
  }, [])

  const handleTagChange = useCallback(
    (tagId: string) => {
      setActiveTagId(tagId)
      setCurrentPage(1)
      syncUrl(tagId)
      maybeScrollToGrid()
    },
    [syncUrl, maybeScrollToGrid],
  )

  const clearFilters = useCallback(() => {
    setActiveTagId("all")
    setCurrentPage(1)
    syncUrl("all")
  }, [syncUrl])

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page)
      maybeScrollToGrid()
    },
    [maybeScrollToGrid],
  )

  useEffect(() => {
    const handlePopState = () => {
      setActiveTagId(readCategoryFromUrl(tags))
      setCurrentPage(1)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [tags])

  const pageItems = useMemo<Array<number | "ellipsis">>(() => {
    const items: Array<number | "ellipsis"> = []
    if (totalPages <= 7) {
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) items.push(pageNumber)
    } else {
      items.push(1)
      if (safePage > 3) items.push("ellipsis")
      const start = Math.max(2, safePage - 1)
      const end = Math.min(totalPages - 1, safePage + 1)
      for (let pageNumber = start; pageNumber <= end; pageNumber++) items.push(pageNumber)
      if (safePage < totalPages - 2) items.push("ellipsis")
      items.push(totalPages)
    }
    return items
  }, [totalPages, safePage])

  return (
    <div className="min-w-0 pb-24">
      <div
        ref={gridRef}
        className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-700/80 pb-4 md:mt-20"
      >
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {activeTagId === "all" ? "All posts" : activeTagName}
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 sm:gap-x-6">
          <div ref={categoryDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setCategoryOpen((isOpen) => !isOpen)}
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              className="group inline-flex items-baseline gap-1.5 font-mono text-xs tracking-wider uppercase transition-colors"
            >
              <span className="text-zinc-200 group-hover:text-white">{activeTagName}</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 self-center text-zinc-500 transition-transform group-hover:text-zinc-300 ${
                  categoryOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {categoryOpen && (
              <ul
                role="listbox"
                className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-zinc-700 bg-zinc-950 py-2 shadow-lg shadow-black/40"
              >
                {sortedTags.map((category) => {
                  const isActive = activeTagId === category.id
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
                        className={`group/item relative flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left font-mono text-xs tracking-wider uppercase transition-colors ${
                          isActive ? "text-white" : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        <span>{category.name}</span>
                        <span
                          className={`tabular-nums ${isActive ? "text-white" : "text-zinc-500"}`}
                        >
                          {String(category.count).padStart(3, "0")}
                        </span>
                        <span
                          className={`pointer-events-none absolute right-4 bottom-1 left-4 h-px origin-left bg-white transition-transform duration-300 ease-out ${
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
            className="group inline-flex items-baseline gap-1.5 font-mono text-xs tracking-wider uppercase transition-colors"
          >
            <span className="text-zinc-200 group-hover:text-white">
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </span>
            <ArrowUpDown
              aria-hidden="true"
              className="h-3.5 w-3.5 self-center text-zinc-500 group-hover:text-zinc-300"
            />
          </button>
          <a
            href="/rss.xml"
            aria-label="RSS feed"
            className="group inline-flex items-baseline gap-1.5 font-mono text-xs tracking-wider text-zinc-200 uppercase transition-colors hover:text-white"
          >
            <span>RSS</span>
            <Rss
              aria-hidden="true"
              className="h-3.5 w-3.5 self-center text-zinc-500 group-hover:text-zinc-300"
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
              <div className="mt-12 h-px bg-zinc-800" />
              <nav
                aria-label="Blog pagination"
                className="mt-8 flex items-center justify-center gap-1"
              >
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => goToPage(safePage - 1)}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>

                {pageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1.5 font-mono text-xs text-zinc-500"
                    >
                      ⋯
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      aria-current={item === safePage ? "page" : undefined}
                      className={`group/page relative flex h-8 min-w-8 items-center justify-center px-2 font-mono text-xs tabular-nums transition-colors ${
                        item === safePage ? "text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className={item === safePage ? "font-semibold" : ""}>
                        {String(item).padStart(2, "0")}
                      </span>
                      <span
                        className={`pointer-events-none absolute right-2 -bottom-0.5 left-2 h-px origin-left bg-white transition-transform duration-300 ease-out ${
                          item === safePage
                            ? "scale-x-100"
                            : "scale-x-0 group-hover/page:scale-x-[0.2]"
                        }`}
                      />
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => goToPage(safePage + 1)}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </nav>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/60">
            <FileSearch aria-hidden="true" className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="mt-6 text-base font-medium text-zinc-300">No posts found</p>
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-zinc-400">
            No posts match the current filters.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {["release", "effect", "typescript"].map((suggestedId) => {
              const suggested = tags.find((tag) => tag.id === suggestedId)
              if (!suggested) return null
              return (
                <button
                  key={suggested.id}
                  type="button"
                  onClick={() => handleTagChange(suggested.id)}
                  className="inline-flex items-center rounded-md border border-zinc-800 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-400 uppercase transition-colors hover:border-zinc-500 hover:text-white"
                >
                  {suggested.name}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-md border border-zinc-700 px-4 py-2 font-mono text-xs tracking-wider text-zinc-300 uppercase transition-colors hover:border-zinc-500 hover:text-white"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
