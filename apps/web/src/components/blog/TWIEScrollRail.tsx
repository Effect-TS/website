import { FormattedDate } from "../ui/FormattedDate"
import type { SerializedPost } from "./PostCard"
import { ScrollRail } from "./ScrollRail"

function TWIECard({ post }: { post: SerializedPost }) {
  const lastSegment = post.id.split("/").pop()
  const issueNumber = /^\d+$/.test(lastSegment ?? "") ? `#${lastSegment}` : null

  return (
    <a
      href={post.href}
      className="group relative flex w-[280px] shrink-0 xl:w-[calc((100%-2.25rem)/4)] flex-col justify-between overflow-hidden rounded-md border border-border bg-muted/40 p-4 pb-5 transition-colors duration-200 hover:border-border-strong hover:bg-muted/70 dark:bg-card/40 dark:hover:bg-card/70"
    >
      <div>
        <div className="flex items-center justify-between">
          {issueNumber && (
            <span className="font-mono text-base font-semibold text-foreground">
              {issueNumber}
            </span>
          )}
          <FormattedDate
            date={post.date}
            className="font-mono text-xs text-muted-foreground tabular-nums"
          />
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
  return (
    <ScrollRail
      title="This Week in Effect"
      ariaLabel="This Week in Effect posts"
      viewAllHref={viewAllHref}
    >
      {posts.map((post) => (
        <TWIECard key={post.id} post={post} />
      ))}
    </ScrollRail>
  )
}
