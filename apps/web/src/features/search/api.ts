import * as Schema from "effect/Schema"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { ChangelogFacets, SearchError, SearchResult } from "./domain"

export class SearchApiGroup extends HttpApiGroup.make("search")
  .add(
    HttpApiEndpoint.get("search", "/api/search", {
      query: {
        query: Schema.String,
        package: Schema.optional(Schema.String),
        channel: Schema.optional(Schema.String),
      },
      success: Schema.Array(SearchResult),
      error: [SearchError],
    }),
  )
  .add(
    HttpApiEndpoint.get("facets", "/api/search/facets", {
      success: ChangelogFacets,
      error: [SearchError],
    }),
  ) {}

export class SearchApi extends HttpApi.make("searchApi").add(SearchApiGroup) {}
