import type { DeepMutable } from "effect/Types"
import Mixedbread from "@mixedbread/sdk"
import { getSecret } from "astro:env/server"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type { SearchResult } from "./domain"
import {
  ApiReferenceGeneratedMetadata,
  DocumentationGeneratedMetadata,
  SearchError,
  StoreSearchResponse,
} from "./domain"

export class Search extends Context.Service<Search>()("app/Search", {
  make: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("MXBAI_API_KEY")
    const storeId = yield* Config.redacted("MXBAI_VECTOR_STORE_ID")

    const mxbai = new Mixedbread({ apiKey: Redacted.value(apiKey) })

    const decodeSearchResponse = Schema.decodeUnknownEffect(StoreSearchResponse)

    function extractSnippet(text: string, maxLength: number = 150): string {
      let cleaned = text
        .replace(/^import\s+.*$/gm, "")
        .replace(/<[A-Z][^>]*\/>/g, "")
        .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, "")
        .replace(/<[^>]*>/g, "")
        .replace(/^\|.*\|$/gm, "")
        .replace(/^\|?[-:\s|]+\|?$/gm, "")
        .replace(/^#{1,6}\s+.*$/gm, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_]/g, "")
        .replace(/^---\n[\s\S]*?\n---\n?/m, "")
        .replace(/---\n[\s\S]*?\n---/g, "")
        .replace(/^\w+:\s*.*$/gm, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      if (cleaned.length <= maxLength) {
        return cleaned
      }
      return cleaned.substring(0, maxLength).trim() + "..."
    }

    function groupSearchResults(response: StoreSearchResponse): ReadonlyArray<SearchResult> {
      const grouped = new Map<string, DeepMutable<SearchResult>>()

      response.data.forEach((chunk) => {
        if (chunk.metadata.content_source === "api-reference") {
          const metadata = chunk.metadata
          const generated = chunk.generated_metadata
          if (!Schema.is(ApiReferenceGeneratedMetadata)(generated)) return
          const href = generated.module_href
          if (!grouped.has(href)) {
            grouped.set(href, {
              kind: "api-reference",
              id: `${metadata.api_version}/${metadata.package_slug}/${generated.module_path}`,
              description: `${metadata.package_name} / ${generated.module_path}`,
              title: generated.module_name,
              href,
              packageName: metadata.package_name,
              version: metadata.api_version,
              chunks: [],
            })
          }
          const page = grouped.get(href)
          if (page === undefined || page.kind !== "api-reference") return
          const declarationHref = `${href}#${generated.declaration_anchor}`
          if (page.chunks.some((match) => match.href === declarationHref)) return
          page.chunks.push({
            id: `${chunk.file_id}-${chunk.chunk_index}`,
            detail: generated.signature || generated.declaration_kind,
            href: declarationHref,
            title: generated.declaration_name,
            snippet: extractSnippet(chunk.text),
            score: chunk.score,
          })
          return
        }

        if (chunk.metadata.content_source !== "documentation") return
        const generated = chunk.generated_metadata
        if (!Schema.is(DocumentationGeneratedMetadata)(generated)) return

        const parentHref = generated.parent_section_anchor
          ? `${generated.page_href}#${generated.parent_section_anchor}`
          : generated.page_href
        if (!grouped.has(parentHref)) {
          grouped.set(parentHref, {
            kind: "documentation",
            id: parentHref,
            breadcrumbs: [generated.group_label, generated.page_label].filter(
              (label) => label.length > 0,
            ),
            description: generated.parent_section_excerpt,
            title: generated.parent_section_title,
            href: parentHref,
            version: generated.docs_version,
            chunks: [],
          })
        }

        const result = grouped.get(parentHref)
        if (result === undefined || result.kind !== "documentation") return
        if (generated.section_level <= 2) return

        const sectionHref = generated.section_anchor
          ? `${generated.page_href}#${generated.section_anchor}`
          : generated.page_href
        if (result.chunks.some((match) => match.href === sectionHref)) return
        result.chunks.push({
          id: `${chunk.file_id}-${chunk.chunk_index}`,
          href: sectionHref,
          title: generated.section_title,
          snippet: generated.section_excerpt,
          score: chunk.score,
        })
      })

      return Array.from(grouped.values())
    }

    const search = Effect.fn("Search.search")(function* (query: string) {
      const rawResponse = yield* Effect.tryPromise({
        try: (signal) =>
          mxbai.stores.search(
            {
              query,
              top_k: 20,
              search_options: { rerank: true, return_metadata: true },
              store_identifiers: [Redacted.value(storeId)],
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
