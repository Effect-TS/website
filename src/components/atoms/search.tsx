import {FC} from 'react'
import {Icon} from '../icons'

export const Search: FC<{className?: string}> = ({className = ''}) => {
  return (
    <div>
      <button className={`h-8 bg-gradient-to-br from-zinc-600 to-zinc-900 rounded-lg p-px ${className}`}>
        <div className="flex items-center gap-2 pr-1.5 pl-3 bg-gradient-to-br from-zinc-800 to-zinc-950 h-full rounded-[7px]">
          <Icon name="search" className="h-4 shrink-0 text-white" />
          <div className="grow text-left">Search Docs...</div>
          <div className="shrink-0 p-px bg-gradient-to-b from-zinc-400 to-zinc-600 rounded-md">
            <div className="bg-zinc-700 text-xs text-white px-1 py-0.5 rounded-[5px]">⌘K</div>
          </div>
        </div>
      </button>
    </div>
  )
}
