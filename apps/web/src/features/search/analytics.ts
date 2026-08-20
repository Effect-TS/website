import type { SearchResult } from "./domain"

type SearchResultKind = SearchResult["kind"]

export type SearchOpenSource = "desktop" | "keyboard" | "mobile" | "unknown"

export type SearchFailureReason =
  | "http"
  | "invalid_response"
  | "network"
  | "timeout"

type SearchResultLevel = "chunk" | "page"

type SearchResultsView = "grouped" | "section"

type AnalyticsProperty = boolean | number | string

interface PostHogClient {
  readonly capture: (
    event: string,
    properties?: Readonly<Record<string, AnalyticsProperty>>,
    options?: {
      readonly send_instantly?: boolean
      readonly transport?: "sendBeacon"
    },
  ) => void
}

declare global {
  interface Window {
    readonly posthog?: PostHogClient
  }
}

interface SearchSession {
  readonly id: string
  readonly openedAt: number
  requestCount: number
  didSelectResult: boolean
}

let session: SearchSession | undefined

function capture(
  event: string,
  properties: Readonly<Record<string, AnalyticsProperty>>,
  options?: {
    readonly send_instantly?: boolean
    readonly transport?: "sendBeacon"
  },
): void {
  if (typeof window === "undefined") return

  try {
    window.posthog?.capture(
      event,
      {
        ...properties,
        ...(session === undefined ? {} : { search_session_id: session.id }),
        $process_person_profile: false,
      },
      options,
    )
  } catch {
    // Analytics must never affect search behavior.
  }
}

function queryProperties(
  query: string,
): Readonly<Record<string, AnalyticsProperty>> {
  const trimmed = query.trim()
  const length = trimmed.length
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length

  return {
    query_length_bucket:
      length <= 5
        ? "1-5"
        : length <= 10
          ? "6-10"
          : length <= 25
            ? "11-25"
            : "26+",
    query_word_count_bucket:
      words <= 1 ? "1" : words <= 3 ? "2-3" : words <= 6 ? "4-6" : "7+",
  }
}

function resultCounts(results: ReadonlyArray<SearchResult>) {
  return {
    result_count: results.length,
    selectable_result_count: results.reduce(
      (count, result) => count + result.chunks.length + 1,
      0,
    ),
    documentation_result_count: results.filter(
      (result) => result.kind === "documentation",
    ).length,
    api_reference_result_count: results.filter(
      (result) => result.kind === "api-reference",
    ).length,
    blog_result_count: results.filter((result) => result.kind === "blog")
      .length,
  } as const
}

export const SearchAnalytics = {
  dialogOpen(
    source: SearchOpenSource,
    version: string,
    hasExistingQuery: boolean,
  ): void {
    session = {
      id: crypto.randomUUID(),
      openedAt: performance.now(),
      requestCount: 0,
      didSelectResult: false,
    }
    capture("search:dialog_open", {
      open_source: source,
      initial_version: version,
      has_existing_query: hasExistingQuery,
    })
  },

  dialogClose(): void {
    if (session === undefined) return
    capture("search:dialog_close", {
      close_reason: session.didSelectResult ? "result_click" : "dismissed",
      duration_ms: Math.round(performance.now() - session.openedAt),
      request_count: session.requestCount,
      did_select_result: session.didSelectResult,
    })
    session = undefined
  },

  requestComplete(
    query: string,
    durationMs: number,
    results: ReadonlyArray<SearchResult>,
  ): void {
    if (session !== undefined) session.requestCount += 1
    capture("search:request_complete", {
      ...queryProperties(query),
      ...resultCounts(results),
      duration_ms: Math.round(durationMs),
      has_results: results.length > 0,
    })
  },

  requestFail(
    query: string,
    durationMs: number,
    reason: SearchFailureReason,
    httpStatus?: number,
  ): void {
    if (session !== undefined) session.requestCount += 1
    capture("search:request_fail", {
      ...queryProperties(query),
      duration_ms: Math.round(durationMs),
      failure_reason: reason,
      ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
    })
  },

  resultClick(properties: {
    readonly kind: SearchResultKind
    readonly level: SearchResultLevel
    readonly rank: number
    readonly chunkRank?: number
    readonly view: SearchResultsView
    readonly destinationPath: string
  }): void {
    if (session !== undefined) session.didSelectResult = true
    capture(
      "search:result_click",
      {
        result_kind: properties.kind,
        result_level: properties.level,
        result_rank: properties.rank,
        ...(properties.chunkRank === undefined
          ? {}
          : { chunk_rank: properties.chunkRank }),
        results_view: properties.view,
        destination_path: properties.destinationPath,
      },
      { transport: "sendBeacon", send_instantly: true },
    )
  },

  versionChange(previousVersion: string, nextVersion: string): void {
    capture("search:version_change", {
      previous_version: previousVersion,
      next_version: nextVersion,
    })
  },

  filterChange(groups: ReadonlyArray<SearchResultKind>): void {
    capture("search:filter_change", {
      result_groups: groups.length === 0 ? "all" : [...groups].sort().join(","),
    })
  },

  viewAll(kind: SearchResultKind): void {
    capture("search:view_all_click", { result_kind: kind })
  },
} as const
