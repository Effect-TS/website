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

    function guideTitleFromPath(filePath: string): string {
      const parts = filePath.split("/")
      const stem = (parts.at(-1) ?? "documentation").replace(/\.(md|mdx)$/, "")
      const name = stem === "index" ? (parts.at(-2) ?? stem) : stem
      return name
        .split(/[-_]/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    }

    function guideFrontmatter(text: string): {
      readonly description?: string
      readonly title?: string
    } {
      const frontmatter = /^---\s*\n([\s\S]*?)\n---/.exec(text)?.[1]
      if (frontmatter === undefined) return {}

      const value = (key: string) => {
        const raw = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(frontmatter)?.[1]?.trim()
        if (raw === undefined) return undefined
        const quote = raw.charAt(0)
        return (quote === '"' || quote === "'") && raw.endsWith(quote) ? raw.slice(1, -1) : raw
      }

      const title = value("title")
      const description = value("description")
      return {
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
      }
    }

    function markdownHeading(text: string): string | undefined {
      return /^#{1,6}\s+(.+?)\s*#*$/m.exec(text)?.[1]?.trim()
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

        const href = guideHref(chunk.metadata)
        if (href === undefined) {
          return
        }

        const generated = Schema.is(GuideGeneratedMetadata)(chunk.generated_metadata)
          ? chunk.generated_metadata
          : undefined
        const frontmatter = guideFrontmatter(chunk.text)
        const discoveredTitle = generated?.title ?? frontmatter.title
        const title = discoveredTitle ?? guideTitleFromPath(chunk.metadata.file_path)
        const description = generated?.description ?? frontmatter.description ?? ""

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

        const page = grouped.get(href)
        if (page === undefined || page.kind !== "guide") return
        if (discoveredTitle !== undefined) page.title = discoveredTitle
        if (description.length > 0) page.description = description

        let chunkTitle = title
        let hasHeading = false
        if (generated !== undefined && generated.chunk_headings.length > 0) {
          chunkTitle = generated.chunk_headings[0]?.text ?? title
          hasHeading = true
        } else if (generated !== undefined && generated.heading_context.length > 0) {
          chunkTitle = generated.heading_context.at(-1)?.text ?? title
          hasHeading = true
        } else {
          const heading = markdownHeading(chunk.text)
          if (heading !== undefined) {
            chunkTitle = heading
            hasHeading = true
          }
        }

        const snippet = extractSnippet(chunk.text)
        const chunkHref = hasHeading ? `${href}#${generateAnchorId(chunkTitle)}` : href
        if (page.chunks.some((match) => match.href === chunkHref)) return

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
