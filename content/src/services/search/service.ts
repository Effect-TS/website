import Mixedbread from "@mixedbread/sdk"
import * as Path from "@effect/platform/Path"
import * as NodePath from "@effect/platform-node/NodePath"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import { SearchError, VectorStoreSearchResponse } from "./domain"
import type { Metadata, SearchResult } from "./domain"
import type { DeepMutable } from "effect/Types"

export class Search extends Effect.Service<Search>()("app/Search", {
  effect: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("MXBAI_API_KEY")
    const vectorStoreId = yield* Config.string("MXBAI_VECTOR_STORE_ID")
    const path = yield* Path.Path
    const mxbai = new Mixedbread({ apiKey: Redacted.value(apiKey) })

    const decodeSearchResponse = Schema.decodeUnknown(VectorStoreSearchResponse)

    function extractSnippet(text: string, maxLength: number = 150): string {
      // Remove markdown and clean up the text
      let cleaned = text
        // Remove import statements
        .replace(/^import\s+.*$/gm, '')
        // Remove MDX React components (self-closing and with children)
        .replace(/<[A-Z][^>]*\/>/g, '')
        .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, '')
        // Remove any remaining JSX/HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove markdown tables
        .replace(/^\|.*\|$/gm, '')
        .replace(/^\|?[-:\s|]+\|?$/gm, '')
        // Remove markdown headers entirely (including the text)
        .replace(/^#{1,6}\s+.*$/gm, '')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove markdown links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove markdown emphasis
        .replace(/[*_]/g, '')
        // Remove frontmatter (YAML blocks between --- delimiters)
        .replace(/^---\n[\s\S]*?\n---\n?/m, '')
        .replace(/---\n[\s\S]*?\n---/g, '')
        // Remove any remaining YAML key-value pairs
        .replace(/^\w+:\s*.*$/gm, '')
        // Clean up whitespace
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length <= maxLength) {
        return cleaned;
      }
      return cleaned.substring(0, maxLength).trim() + '...';
    }

    function generateAnchorId(text: string) {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const CONTENT_PATH = "src/content/docs"
    function generateHref(metadata: typeof Metadata.Type): string | undefined {
      const index = metadata.filePath.indexOf(CONTENT_PATH)
      if (index === -1) {
        return undefined
      }
      const subpath = metadata.filePath.substring(index + CONTENT_PATH.length)
      const parsed = path.parse(subpath)
      return path.join(parsed.dir, parsed.name, "/")
    }

    function groupSearchResults(response: VectorStoreSearchResponse): ReadonlyArray<SearchResult> {
      const grouped = new Map<string, DeepMutable<SearchResult>>()

      response.data.forEach((chunk) => {
        const title = chunk.generatedMetadata.title
        const description = chunk.generatedMetadata.description
        const chunkHeadings = chunk.generatedMetadata.chunkHeadings
        const headingContext = chunk.generatedMetadata.headingContext

        const href = generateHref(chunk.metadata)

        // Skip chunks where we cannot generate a valid href
        if (Predicate.isUndefined(href)) {
          return
        }

        if (!grouped.has(href)) {
          grouped.set(href, {
            id: chunk.fileId,
            description,
            title,
            href,
            chunks: []
          })
        }

        const page = grouped.get(href)!

        let chunkTitle = title
        if (chunkHeadings.length > 0) {
          chunkTitle = chunkHeadings[0]!.text ?? ""
        } else if (headingContext.length > 0) {
          chunkTitle = headingContext[headingContext.length - 1]!.text ?? ""
        }

        const snippet = extractSnippet(chunk.text)

        page.chunks.push({
          id: `${chunk.fileId}-${chunk.chunkIndex}`,
          title: chunkTitle,
          snippet,
          score: chunk.score,
          anchorId: generateAnchorId(chunkTitle)
        })
      })

      return Array.from(grouped.values())
    }

    const search = Effect.fn("Search.search")(function* (query: string) {
      const searchParams: Mixedbread.VectorStores.VectorStoreSearchParams = {
        query,
        top_k: 10,
        search_options: { rerank: true, return_metadata: true },
        vector_store_identifiers: [vectorStoreId],
      }

      const response = yield* Effect.tryPromise({
        try: (signal) => mxbai.vectorStores.search(searchParams, { signal }),
        catch: (cause) => new SearchError({ cause }),
      }).pipe(Effect.flatMap(decodeSearchResponse))

      return groupSearchResults(response)
    },
      Effect.catchTag("ParseError", (cause) => new SearchError({ cause })),
      Effect.tapErrorCause(Effect.logError)
    )

    return {
      search,
    } as const
  }),
  dependencies: [
    Layer.setConfigProvider(ConfigProvider.fromJson(import.meta.env)),
    NodePath.layer
  ],
}) { }
