import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { SearchApi } from "./api"
import { Search } from "./service"

const SearchHandlers = HttpApiBuilder.group(
  SearchApi,
  "search",
  Effect.fn(function* (handlers) {
    const search = yield* Search
    return handlers
      .handle("search", ({ query }) =>
        search.search(query.query, {
          package: query.package,
          channel: query.channel,
        }),
      )
      .handle("facets", () => search.facets())
  }),
).pipe(Layer.provide(Search.layer))

export const SearchLayer = HttpApiBuilder.layer(SearchApi).pipe(
  Layer.provide(SearchHandlers),
)
