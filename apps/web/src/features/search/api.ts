import * as Schema from "effect/Schema"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import { DocsVersion } from "@/lib/versions"
import { SEARCH_GROUPS, SearchError, SearchResult } from "./domain"

const PackageSlug = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9._-]*$/),
)

const groupPattern = SEARCH_GROUPS.join("|")

// Comma-separated result groups, e.g. `blog,changelog`.
const SearchGroups = Schema.String.check(
  Schema.isPattern(
    new RegExp(`^(?:${groupPattern})(?:,(?:${groupPattern}))*$`),
  ),
)

export class SearchApiGroup extends HttpApiGroup.make("search").add(
  HttpApiEndpoint.get("search", "/api/search", {
    query: {
      query: Schema.String,
      package: Schema.optional(PackageSlug),
      version: Schema.optional(DocsVersion),
      groups: Schema.optional(SearchGroups),
    },
    success: Schema.Array(SearchResult),
    error: [SearchError],
  }),
) {}

export class SearchApi extends HttpApi.make("searchApi").add(SearchApiGroup) {}
