export function TagChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-zinc-400 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:border-zinc-600 dark:text-zinc-200">
      {name}
    </span>
  )
}

export function OverflowChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
      +{count}
    </span>
  )
}
