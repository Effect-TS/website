export interface LessonRouteEntry {
  readonly id: string
  readonly data: { readonly part: number; readonly order: number }
}

export interface LessonRoute<A extends LessonRouteEntry> {
  readonly entry: A
  readonly slug: string
  readonly prev: string | undefined
  readonly next: string | undefined
}

export function lessonSlug({ id, data }: LessonRouteEntry): string {
  return `part-${data.part}/${String(data.order).padStart(2, "0")}-${id}`
}

/**
 * Orders lessons by part, then order, and links each one to its neighbours
 * across part boundaries.
 */
export function lessonRoutes<A extends LessonRouteEntry>(
  entries: ReadonlyArray<A>,
): ReadonlyArray<LessonRoute<A>> {
  const sorted = [...entries].sort(
    (a, b) => a.data.part - b.data.part || a.data.order - b.data.order,
  )
  const slugs = sorted.map(lessonSlug)
  return sorted.map((entry, index) => ({
    entry,
    slug: slugs[index]!,
    prev: slugs[index - 1],
    next: slugs[index + 1],
  }))
}
