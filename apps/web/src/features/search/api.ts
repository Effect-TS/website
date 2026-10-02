import * as Schema from "effect/Schema"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import { SearchError, SearchResult } from "./domain"

export class SearchApiGroup extends HttpApiGroup.make("search").add(
  HttpApiEndpoint.get("search", "/api/search", {
    query: { query: Schema.String },
    success: Schema.Array(SearchResult),
    error: [SearchError],
  }),
) {}

export class SearchApi extends HttpApi.make("searchApi").add(SearchApiGroup) {}
