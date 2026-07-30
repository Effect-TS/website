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
import type { GuideMetadata, SearchResult } from "./domain"
import {
  ApiReferenceGeneratedMetadata,
  GuideGeneratedMetadata,
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

    function generateAnchorId(text: string) {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    }

    const CONTENT_PATH = "src/content/docs/"
    function guideHref(metadata: typeof GuideMetadata.Type): string | undefined {
      const index = metadata.file_path.indexOf(CONTENT_PATH)
      if (index === -1) return undefined
      const subpath = metadata.file_path
        .substring(index + CONTENT_PATH.length)
        .replace(/\.(md|mdx)$/, "")
        .replace(/(^|\/)index$/, "")
      return `/docs/${subpath}`.replace(/\/+$/, "/")
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

        const generated = chunk.generated_metadata
        if (!Schema.is(GuideGeneratedMetadata)(generated)) return
        const title = generated.title
        const description = generated.description ?? ""
        const chunkHeadings = generated.chunk_headings
        const headingContext = generated.heading_context

        const href = guideHref(chunk.metadata)

        if (href === undefined) {
          return
        }

        if (!grouped.has(href)) {
          grouped.set(href, {
            kind: "guide",
            id: chunk.file_id,
            description,
            title,
            href,
            chunks: [],
          })
        }

        const page = grouped.get(href)!

        let chunkTitle = title
        if (chunkHeadings.length > 0) {
          chunkTitle = chunkHeadings[0]?.text ?? ""
        } else if (headingContext.length > 0) {
          chunkTitle = headingContext[headingContext.length - 1]?.text ?? ""
        }

        const snippet = extractSnippet(chunk.text)
        const hasHeading = chunkHeadings.length > 0 || headingContext.length > 0
        const chunkHref = hasHeading ? `${href}#${generateAnchorId(chunkTitle)}` : href

        page.chunks.push({
          id: `${chunk.file_id}-${chunk.chunk_index}`,
          href: chunkHref,
          title: chunkTitle,
          snippet,
          score: chunk.score,
        })
      })

      return Array.from(grouped.values())
    }

    const search = Effect.fn("Search.search")(function* (query: string) {
      const responses = yield* Effect.forEach(
        ["docs", "api-reference"] as const,
        (contentSource) =>
          Effect.tryPromise({
            try: (signal) =>
              mxbai.stores.search(
                {
                  query,
                  top_k: 10,
                  filters: { key: "content_source", operator: "eq", value: contentSource },
                  search_options: { rerank: true, return_metadata: true },
                  store_identifiers: [Redacted.value(storeId)],
                },
                { signal },
              ),
            catch: (cause) => new SearchError({ cause }),
          }).pipe(
            Effect.flatMap(decodeSearchResponse),
            Effect.catchTag("SchemaError", (cause) => new SearchError({ cause })),
          ),
        { concurrency: "unbounded" },
      )

      return groupSearchResults({
        object: "list",
        data: responses.flatMap((response) => response.data).toSorted((a, b) => b.score - a.score),
      })
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
