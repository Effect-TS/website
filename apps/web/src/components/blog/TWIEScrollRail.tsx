import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { SerializedPost } from "./PostCard"

function TWIECard({ post }: { post: SerializedPost }) {
  const lastSegment = post.id.split("/").pop()
  const issueNumber = /^\d+$/.test(lastSegment ?? "") ? `#${lastSegment}` : null

  return (
    <a
      href={post.href}
      className="group relative flex w-[280px] shrink-0 flex-col justify-between overflow-hidden rounded-md border border-border bg-muted/40 p-4 pb-5 transition-colors duration-200 hover:border-border-strong hover:bg-muted/70 dark:bg-card/40 dark:hover:bg-card/70"
    >
      <div>
        <div className="flex items-center justify-between">
          {issueNumber && (
            <span className="font-mono text-base font-semibold text-foreground">
              {issueNumber}
            </span>
          )}
          <time className="font-mono text-xs text-muted-foreground tabular-nums">
            {post.date}
          </time>
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
      </div>
    </a>
  )
}

export function TWIEScrollRail({
  posts,
  viewAllHref,
}: {
  posts: SerializedPost[]
  viewAllHref: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    void posts.length
    updateScrollState()
  }, [updateScrollState, posts.length])

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" })
  }, [])

  if (posts.length === 0) return null

  return (
    <section
      aria-label="This Week in Effect posts"
      className="pt-16 pb-2 md:pt-20"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          This Week in Effect
        </h2>
        <div className="flex items-center gap-5">
          <a
            href={viewAllHref}
            className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </a>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto py-1 pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {posts.map((post) => (
            <TWIECard key={post.id} post={post} />
          ))}
        </div>

        {canScrollRight && (
          <div className="pointer-events-none absolute top-0 right-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent" />
        )}
        {canScrollLeft && (
          <div className="pointer-events-none absolute top-0 bottom-2 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-2 bottom-4 flex items-center gap-1 text-xs text-muted-foreground sm:hidden">
            <span>Swipe</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </section>
  )
}
