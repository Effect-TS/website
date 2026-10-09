import type { SerializedPost } from "./PostCard"
import { ScrollRail } from "./ScrollRail"

function MOTWCard({ post, entry }: { post: SerializedPost; entry: number }) {
  const title = post.title.replace(/^Module of the Week\s*-\s*/, "")

  return (
    <a
      href={post.href}
      className="group relative flex w-[280px] shrink-0 flex-col justify-between overflow-hidden rounded-md border border-border bg-muted/40 p-4 pb-5 transition-colors duration-200 hover:border-border-strong hover:bg-muted/70 sm:w-[340px] xl:w-[calc((100%-1.5rem)/3)] dark:bg-card/40 dark:hover:bg-card/70"
    >
      <div>
        <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
          <span className="shrink-0 font-medium text-foreground tabular-nums">
            {String(entry).padStart(2, "0")}
          </span>
          {post.packageName && (
            <>
              <span
                aria-hidden="true"
                className="h-3 w-px shrink-0 bg-border-strong"
              />
              <span className="truncate text-muted-foreground">
                from "{post.packageName}"
              </span>
            </>
          )}
        </div>
        <h3 className="mt-3 truncate text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
      </div>
    </a>
  )
}

export function MOTWScrollRail({
  posts,
  viewAllHref,
}: {
  posts: SerializedPost[]
  viewAllHref: string
}) {
  return (
    <ScrollRail
      title="Module of the Week"
      ariaLabel="Module of the Week posts"
      viewAllHref={viewAllHref}
      itemCount={posts.length}
    >
      {posts.map((post, i) => (
        <MOTWCard key={post.id} post={post} entry={posts.length - i} />
      ))}
    </ScrollRail>
  )
}
