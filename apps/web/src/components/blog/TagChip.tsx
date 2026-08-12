export function TagChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-strong px-2 py-0.5 font-mono text-xs text-muted-foreground">
      {name}
    </span>
  )
}

export function OverflowChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-strong px-2 py-0.5 font-mono text-xs text-muted-foreground">
      +{count}
    </span>
  )
}
