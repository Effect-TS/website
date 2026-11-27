// Search analytics and server traces describe a query by its rough size, never
// its text, so what people type stays in the browser and the search provider.

export type QueryLengthBucket = "1-5" | "6-10" | "11-25" | "26+"

export type QueryWordCountBucket = "1" | "2-3" | "4-6" | "7+"

export interface QueryShape {
  readonly lengthBucket: QueryLengthBucket
  readonly wordCountBucket: QueryWordCountBucket
}

export function queryShape(query: string): QueryShape {
  const trimmed = query.trim()
  const length = trimmed.length
  const words = length === 0 ? 0 : trimmed.split(/\s+/).length

  return {
    lengthBucket:
      length <= 5
        ? "1-5"
        : length <= 10
          ? "6-10"
          : length <= 25
            ? "11-25"
            : "26+",
    wordCountBucket:
      words <= 1 ? "1" : words <= 3 ? "2-3" : words <= 6 ? "4-6" : "7+",
  }
}
