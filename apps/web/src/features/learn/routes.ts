export interface LessonRouteEntry {
  readonly id: string
  readonly data: {
    readonly part: number
    readonly order: number
    readonly mode?: string
  }
}

export interface LessonRoute<A extends LessonRouteEntry> {
  readonly entry: A
  readonly slug: string
  readonly prev: string | undefined
  readonly next: string | undefined
}

/**
 * Guides have no lesson number, so their slug has none either.
 */
export function lessonSlug({ id, data }: LessonRouteEntry): string {
  return data.mode === "guide"
    ? `part-${data.part}/${id}`
    : `part-${data.part}/${String(data.order).padStart(2, "0")}-${id}`
}

const isGuide = (entry: LessonRouteEntry) => entry.data.mode === "guide"

/**
 * Orders lessons by part, then order, with guides before the lesson of the
 * same order (by id among themselves), and links each one to its neighbours
 * across part boundaries.
 */
export function lessonRoutes<A extends LessonRouteEntry>(
  entries: ReadonlyArray<A>,
): ReadonlyArray<LessonRoute<A>> {
  const sorted = [...entries].sort(
    (a, b) =>
      a.data.part - b.data.part ||
      a.data.order - b.data.order ||
      Number(isGuide(b)) - Number(isGuide(a)) ||
      a.id.localeCompare(b.id),
  )
  const slugs = sorted.map(lessonSlug)
  return sorted.map((entry, index) => ({
    entry,
    slug: slugs[index]!,
    prev: slugs[index - 1],
    next: slugs[index + 1],
  }))
}
