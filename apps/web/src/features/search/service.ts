import Mixedbread from "@mixedbread/sdk"
import { getSecret } from "astro:env/server"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type { DocsVersion } from "@/lib/versions"
import { type SearchGroup, SearchError, StoreSearchResponse } from "./domain"
import { searchFilter } from "./filters"
import { groupSearchResults } from "./grouping"

// A changelog-only search has many repeated notes to collapse, so it asks for more.
const topK = (options: {
  readonly groups?: ReadonlyArray<SearchGroup> | undefined
  readonly packageSlug?: string | undefined
}) =>
  options.packageSlug === undefined &&
  options.groups?.length === 1 &&
  options.groups[0] === "changelog"
    ? 40
    : 20

export class Search extends Context.Service<Search>()("app/Search", {
  make: Effect.gen(function* () {
    const apiKey = yield* Config.Redacted("MXBAI_API_KEY")
    const storeId = yield* Config.Redacted("MXBAI_VECTOR_STORE_ID")

    const mxbai = new Mixedbread({ apiKey: Redacted.value(apiKey) })

    const decodeSearchResponse = Schema.decodeUnknownEffect(StoreSearchResponse)

    const search = Effect.fn("Search.search")(function* (options: {
      readonly query: string
      readonly version?: DocsVersion | undefined
      readonly groups?: ReadonlyArray<SearchGroup> | undefined
      readonly packageSlug?: string | undefined
    }) {
      const filters = searchFilter(options)
      // No group has content for this version, so there is nothing to ask for.
      if (filters === null) return []

      const rawResponse = yield* Effect.tryPromise({
        try: (signal) =>
          mxbai.stores.search(
            {
              query: options.query,
              top_k: topK(options),
              search_options: { rerank: true, return_metadata: true },
              store_identifiers: [Redacted.value(storeId)],
              ...(filters === undefined ? {} : { filters }),
            },
            { signal },
          ),
        catch: (cause) => new SearchError({ cause }),
      })

      const response = yield* decodeSearchResponse(rawResponse).pipe(
        Effect.catchTag("SchemaError", (cause) => new SearchError({ cause })),
      )

      return groupSearchResults(response)
    })

    return {
      search,
    } as const
  }),
}) {
  static layer = Layer.effect(this, this.make).pipe(
    Layer.provide(
      ConfigProvider.layer(
        ConfigProvider.fromUnknown({
          MXBAI_API_KEY: getSecret("MXBAI_API_KEY"),
          MXBAI_VECTOR_STORE_ID: getSecret("MXBAI_VECTOR_STORE_ID"),
        }),
      ),
    ),
  )
}
