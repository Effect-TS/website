import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { SearchError, SearchResult } from "./domain"
import { Search } from "./service"

class SearchApiGroup extends HttpApiGroup.make("search").add(
  HttpApiEndpoint.get("search", "/api/search", {
    query: { query: Schema.String },
    success: Schema.Array(SearchResult),
    error: [SearchError],
  }),
) {}

class SearchApi extends HttpApi.make("searchApi").add(SearchApiGroup) {}

const SearchHandlers = HttpApiBuilder.group(
  SearchApi,
  "search",
  Effect.fn(function* (handlers) {
    const search = yield* Search
    return handlers.handle("search", ({ query }) => search.search(query.query))
  }),
).pipe(Layer.provide(Search.layer))

export const SearchLayer = HttpApiBuilder.layer(SearchApi).pipe(Layer.provide(SearchHandlers))
