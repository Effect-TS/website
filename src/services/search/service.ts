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
  BlogGeneratedMetadata,
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

    function markdownSection(
      generated: typeof DocumentationGeneratedMetadata.Type | typeof BlogGeneratedMetadata.Type,
    ) {
      const firstHeading = generated.chunk_headings[0]
      const endLine = generated.start_line + generated.num_lines
      const chunkSection =
        firstHeading === undefined
          ? undefined
          : generated.search.sections.find(
              (section) =>
                section.line >= generated.start_line &&
                section.line <= endLine &&
                section.level === firstHeading.level &&
                section.title === firstHeading.text,
            )
      return (
        chunkSection ??
        generated.search.sections.findLast((section) => section.line <= generated.start_line) ??
        generated.search.sections[0]
      )
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

        if (chunk.metadata.content_source === "blog") {
          const generated = chunk.generated_metadata
          if (!Schema.is(BlogGeneratedMetadata)(generated)) return
          const href = generated.search.page_href
          if (!grouped.has(href)) {
            grouped.set(href, {
              kind: "blog",
              id: href,
              title: generated.search.page_title,
              description: generated.search.description,
              href,
              publishedAt: generated.search.published_at,
              authors: [...generated.search.authors],
              tags: [...generated.search.tags],
              chunks: [],
            })
          }

          const result = grouped.get(href)
          if (result === undefined || result.kind !== "blog") return
          const section = markdownSection(generated)
          if (section === undefined || section.anchor.length === 0) return
          const sectionHref = `${href}#${section.anchor}`
          if (result.chunks.some((match) => match.href === sectionHref)) return
          result.chunks.push({
            id: `${chunk.file_id}-${chunk.chunk_index}`,
            href: sectionHref,
            title: section.title,
            snippet: section.excerpt || extractSnippet(chunk.text),
            score: chunk.score,
          })
          return
        }

        if (chunk.metadata.content_source !== "documentation") return
        const generated = chunk.generated_metadata
        if (!Schema.is(DocumentationGeneratedMetadata)(generated)) return
        const section = markdownSection(generated)
        if (section === undefined) return
        const parent =
          generated.search.sections.find(
            (candidate) => candidate.anchor === section.parent_anchor,
          ) ?? section

        const parentHref = parent.anchor
          ? `${generated.search.page_href}#${parent.anchor}`
          : generated.search.page_href
        if (!grouped.has(parentHref)) {
          grouped.set(parentHref, {
            kind: "documentation",
            id: parentHref,
            breadcrumbs: [...generated.search.breadcrumbs],
            description: parent.excerpt,
            title: parent.title,
            href: parentHref,
            version: generated.search.docs_version,
            chunks: [],
          })
        }

        const result = grouped.get(parentHref)
        if (result === undefined || result.kind !== "documentation") return
        if (section.anchor === parent.anchor) return

        const sectionHref = section.anchor
          ? `${generated.search.page_href}#${section.anchor}`
          : generated.search.page_href
        if (result.chunks.some((match) => match.href === sectionHref)) return
        result.chunks.push({
          id: `${chunk.file_id}-${chunk.chunk_index}`,
          href: sectionHref,
          title: section.title,
          snippet: section.excerpt || extractSnippet(chunk.text),
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
