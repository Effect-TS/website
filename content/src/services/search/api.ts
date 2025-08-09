import * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { SearchError, SearchResult } from "./domain"
import { Search } from "./service"

const SearchApi = HttpApi.make("Search").add(
  HttpApiGroup.make("search").add(
    HttpApiEndpoint.get("search", "/api/search")
      .setUrlParams(Schema.Struct({ query: Schema.String }))
      .addSuccess(Schema.Array(SearchResult))
      .addError(SearchError),
  ),
)

const SearchHandlers = HttpApiBuilder.group(
  SearchApi,
  "search",
  Effect.fn(function* (handlers) {
    const search = yield* Search
    return handlers.handle("search", ({ urlParams }) => search.search(urlParams.query))
  }),
).pipe(Layer.provide(Search.Default))

export const SearchLayer = HttpApiBuilder.api(SearchApi).pipe(Layer.provide(SearchHandlers))
