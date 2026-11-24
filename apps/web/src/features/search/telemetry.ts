import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from "@mixedbread/sdk"
import * as Schema from "effect/Schema"
import type { SearchResult } from "./domain"
import { queryShape } from "./query-shape"
import type { SearchScope } from "./scope"

// Span attributes for `/api/search`, so a failed search in Maple says where and
// why it failed. The query itself is never recorded: only its size, and any
// error text has the query removed first.

type Attributes = Readonly<Record<string, string | number | boolean>>

/** Where a search failed. */
export type SearchFailureStage =
  /** Looking up a preview's own store. Previews only. */
  | "store_scope"
  /** The Mixedbread search call. */
  | "provider"
  /** Mixedbread answered with a shape the site does not expect. */
  | "response_decode"

const MAX_MESSAGE_LENGTH = 500

export function requestAttributes(query: string): Attributes {
  const shape = queryShape(query)
  return {
    "search.query.length_bucket": shape.lengthBucket,
    "search.query.word_count_bucket": shape.wordCountBucket,
  }
}

export function scopeAttributes(scope: SearchScope): Attributes {
  return {
    "search.store.kind":
      scope.store_identifiers.length > 1 ? "preview" : "production",
    "search.store.hidden_file_count": scope.file_ids?.[1].length ?? 0,
  }
}

export function resultAttributes(
  results: ReadonlyArray<SearchResult>,
): Attributes {
  const count = (kind: SearchResult["kind"]) =>
    results.filter((result) => result.kind === kind).length
  return {
    "search.result.count": results.length,
    "search.result.documentation_count": count("documentation"),
    "search.result.api_reference_count": count("api-reference"),
    "search.result.blog_count": count("blog"),
  }
}

export function failureAttributes(
  stage: SearchFailureStage,
  cause: unknown,
  query: string,
): Attributes {
  return {
    "search.failure.stage": stage,
    ...causeAttributes(cause, (message) => scrub(message, query)),
  }
}

function causeAttributes(
  cause: unknown,
  clean: (message: string) => string,
): Attributes {
  // Subclasses first: every Mixedbread error is an `APIError`.
  if (cause instanceof APIUserAbortError) return { "error.type": "aborted" }
  if (cause instanceof APIConnectionTimeoutError) {
    return { "error.type": "timeout" }
  }
  if (cause instanceof APIConnectionError) {
    return {
      "error.type": "connection",
      "search.failure.message": clean(cause.message),
    }
  }
  if (cause instanceof APIError) {
    const requestId = cause.headers?.get("x-request-id")
    return {
      "error.type":
        cause.status === undefined ? "APIError" : String(cause.status),
      ...(cause.status === undefined
        ? {}
        : { "search.provider.status_code": cause.status }),
      "search.failure.message": clean(cause.message),
      ...(requestId == null ? {} : { "search.provider.request_id": requestId }),
    }
  }
  if (Schema.isSchemaError(cause)) {
    return {
      "error.type": "SchemaError",
      "search.failure.message": clean(cause.message),
    }
  }
  if (cause instanceof Error) {
    return {
      "error.type": cause.name,
      "search.failure.message": clean(cause.message),
    }
  }
  return { "error.type": "unknown" }
}

// Provider errors can echo their input, such as a validation error that quotes
// the field it rejected. Both the raw query and its JSON-escaped form are
// replaced, since error bodies arrive as JSON. Queries under three characters
// are left alone: replacing them would mangle every matching word.
const MIN_SCRUBBED_LENGTH = 3

function scrub(message: string, query: string): string {
  let cleaned = message
  const forms = [query.trim(), jsonEscaped(query.trim())]
  for (const form of new Set(forms)) {
    if (form.length >= MIN_SCRUBBED_LENGTH) {
      cleaned = cleaned.replaceAll(form, "<query>")
    }
  }
  return cleaned.length <= MAX_MESSAGE_LENGTH
    ? cleaned
    : `${cleaned.slice(0, MAX_MESSAGE_LENGTH)}…`
}

function jsonEscaped(value: string): string {
  return JSON.stringify(value).slice(1, -1)
}
