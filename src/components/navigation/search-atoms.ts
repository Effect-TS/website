import * as Effect from "effect/Effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import { SearchError, type SearchResult } from "@/services/search/domain"

export const searchQueryAtom = Atom.make("")

export const debouncedQueryAtom = searchQueryAtom.pipe(Atom.debounce(300))

export const searchResultsAtom = Atom.make((get) => {
  const query = get(debouncedQueryAtom)
  if (query.trim().length === 0) {
    return Effect.succeed([] as ReadonlyArray<SearchResult>)
  }

  const url = `/api/search?query=${encodeURIComponent(query)}`

  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(url, { signal }),
      catch: (cause) => new SearchError({ cause }),
    })

    if (!response.ok) {
      return yield* new SearchError({
        cause: new Error(`Search request failed: ${response.status}`),
      })
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json() as Promise<ReadonlyArray<SearchResult>>,
      catch: (cause) => new SearchError({ cause }),
    })

    return data
  })
})
