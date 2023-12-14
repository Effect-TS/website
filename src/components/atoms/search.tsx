import { FC } from "react"
import { Icon } from "../icons"

export const Search: FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div>
      <button className={`h-8 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg p-px ${className}`}>
        <div className="flex items-center gap-2 pr-1 pl-3 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-950 h-full rounded-[7px]">
          <Icon name="search" className="h-4 shrink-0 text-black dark:text-white" />
          <div className="grow text-left">Search Docs...</div>
          <div className="shrink-0 p-px bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-400 dark:to-zinc-600 rounded">
            <div className="bg-zinc-200 dark:bg-zinc-700 text-xs text-black dark:text-white px-1 py-0.5 rounded-[3px]">⌘K</div>
          </div>
        </div>
      </button>
    </div>
  )
}
