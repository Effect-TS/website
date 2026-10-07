import Mixedbread from "@mixedbread/sdk"
import { getSecret } from "astro:env/server"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { SearchError, StoreSearchResponse } from "./domain"
import { groupSearchResults } from "./grouping"

export class Search extends Context.Service<Search>()("app/Search", {
  make: Effect.gen(function* () {
    const apiKey = yield* Config.Redacted("MXBAI_API_KEY")
    const storeId = yield* Config.Redacted("MXBAI_VECTOR_STORE_ID")

    const mxbai = new Mixedbread({ apiKey: Redacted.value(apiKey) })

    const decodeSearchResponse = Schema.decodeUnknownEffect(StoreSearchResponse)

    const search = Effect.fn("Search.search")(function* (
      query: string,
      packageSlug?: string,
    ) {
      const rawResponse = yield* Effect.tryPromise({
        try: (signal) =>
          mxbai.stores.search(
            {
              query,
              top_k: 20,
              search_options: { rerank: true, return_metadata: true },
              store_identifiers: [Redacted.value(storeId)],
              ...(packageSlug === undefined
                ? {}
                : {
                    filters: {
                      all: [
                        {
                          key: "content_source",
                          operator: "eq",
                          value: "changelog",
                        },
                        {
                          key: "package_slug",
                          operator: "eq",
                          value: packageSlug,
                        },
                      ],
                    },
                  }),
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
