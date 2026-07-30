import { ArrowRight } from "lucide-react"
import { blogPostHref, type BlogPostSummary } from "../domain"
import { OverflowChip, TagChip } from "./TagChip"

export function PostCard({ post }: { post: BlogPostSummary }) {
  const visibleTags = [...post.tags].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 2)
  const overflow = post.tags.length - 2

  return (
    <a
      href={blogPostHref(post.id)}
      className="group -mx-4 block border-t border-zinc-300/80 px-4 py-6 transition-colors first:border-t-0 hover:bg-zinc-100/60 dark:border-zinc-700/80 dark:hover:bg-[#141315]"
    >
      <div className="grid grid-cols-12 items-baseline gap-4">
        <div className="col-span-12 min-w-0 md:col-span-8">
          <h3 className="relative inline-block text-lg font-semibold text-zinc-900 dark:text-white">
            <span>{post.title}</span>
            <ArrowRight
              aria-hidden="true"
              className="ml-2 inline-block h-4 w-4 -translate-x-1 align-middle text-zinc-900 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 dark:text-white"
            />
            <span className="absolute right-0 -bottom-0.5 left-0 h-px origin-left scale-x-0 bg-zinc-900 transition-transform duration-300 ease-out group-hover:scale-x-100 dark:bg-white" />
          </h3>
          <p className="mt-2 line-clamp-2 text-base leading-relaxed text-zinc-700 transition-colors group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200">
            {post.excerpt}
          </p>
        </div>
        <div className="col-span-12 flex flex-wrap items-baseline gap-x-3 gap-y-2 md:col-span-4 md:flex-col md:items-end md:gap-2">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {visibleTags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} />
            ))}
            {overflow > 0 && <OverflowChip count={overflow} />}
          </div>
          <time className="shrink-0 font-mono text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
            {post.date}
          </time>
        </div>
      </div>
    </a>
  )
}
