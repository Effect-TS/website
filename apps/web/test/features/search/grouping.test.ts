import * as Schema from "effect/Schema"
import { assert, describe, test } from "vite-plus/test"
import { StoreSearchResponse } from "../../../src/features/search/domain.ts"
import { groupSearchResults } from "../../../src/features/search/grouping.ts"

const common = {
  synced: true,
  file_hash: "abc",
  git_branch: "main",
  git_commit: "7333ffed307d2479fc3598d3abc9355adbd86cd6",
  uploaded_at: "2026-01-24T14:37:11.825Z",
}

const chunk = (
  fields: {
    readonly text: string
    readonly metadata: Record<string, unknown>
    readonly generated: Record<string, unknown>
  },
  index: number,
) => ({
  type: "text",
  model: "mixedbread-ai/mxbai-embed-large-v1",
  text: fields.text,
  score: 1 - index / 100,
  metadata: { ...common, ...fields.metadata },
  filename: "file",
  file_id: "file-1",
  store_id: "store-1",
  chunk_index: index,
  mime_type: "text/plain",
  generated_metadata: fields.generated,
})

const group = (chunks: ReadonlyArray<ReturnType<typeof chunk>>) =>
  groupSearchResults(
    Schema.decodeUnknownSync(StoreSearchResponse)({
      object: "list",
      data: chunks,
    }),
  )

const apiChunk = (anchor: string, text = "# run\n\nRuns an effect.") =>
  ({
    text,
    metadata: {
      api_version: "v4",
      content_source: "api-reference",
      package_name: "effect",
      package_slug: "effect",
    },
    generated: {
      type: "text",
      declaration_anchor: anchor,
      declaration_kind: "function",
      declaration_name: anchor,
      module_href: "/docs/v4/api/effect/Effect",
      module_name: "Effect",
      module_path: "Effect",
      signature: "",
    },
  }) as const

const changelogChunk = (version: string, text: string) =>
  ({
    text,
    metadata: {
      channel: "v4",
      content_source: "changelog",
      package_name: "@effect/sql-pg",
      package_slug: "sql-pg",
    },
    generated: {
      type: "text",
      page_href: "/docs/v4/api/sql-pg/changelog",
      version,
    },
  }) as const

const section = (
  line: number,
  level: number,
  title: string,
  anchor: string,
  parent: string,
) =>
  JSON.stringify({
    line,
    level,
    title,
    anchor,
    parent_anchor: parent,
    excerpt: `${title} excerpt`,
  })

const markdownChunk = (source: "documentation" | "blog", heading: string) => {
  const search =
    source === "documentation"
      ? {
          schema_version: 1,
          content_source: "documentation",
          docs_version: "v4",
          breadcrumbs: ["Guides"],
          page_href: "/docs/v4/guides/services",
          page_label: "Services",
          page_title: "Services",
          sections: [
            section(1, 2, "Overview", "overview", ""),
            section(10, 3, "Layers", "layers", "overview"),
          ],
        }
      : {
          schema_version: 1,
          content_source: "blog",
          page_href: "/blog/post",
          page_title: "A post",
          description: "About things",
          published_at: "2026-01-01",
          authors: ["Jane"],
          tags: ["effect"],
          sections: [
            section(1, 2, "Intro", "intro", ""),
            section(5, 2, "Empty", "", ""),
          ],
        }
  return {
    text: `## ${heading}\n\nBody text.`,
    metadata: { content_source: source, file_path: "x.mdx" },
    generated: {
      type: "markdown",
      start_line:
        heading === "Layers"
          ? 10
          : heading === "Intro"
            ? 1
            : heading === "Empty"
              ? 5
              : 1,
      num_lines: 3,
      chunk_headings: [{ level: heading === "Layers" ? 3 : 2, text: heading }],
      heading_context: [],
      search,
    },
  } as const
}

describe("groupSearchResults", () => {
  test("lists API declarations under their module and skips repeated links", () => {
    const results = group([
      chunk(apiChunk("run"), 0),
      chunk(apiChunk("runSync"), 1),
      chunk(apiChunk("run", "# run again"), 2),
    ])
    assert.lengthOf(results, 1)
    const [module] = results
    assert.strictEqual(module?.kind, "api-reference")
    assert.strictEqual(module?.href, "/docs/v4/api/effect/Effect")
    assert.deepStrictEqual(
      module?.chunks.map(({ href }) => href),
      ["/docs/v4/api/effect/Effect#run", "/docs/v4/api/effect/Effect#runSync"],
    )
  })

  test("lists changelog releases under the package page, once each", () => {
    const results = group([
      chunk(
        changelogChunk(
          "4.0.1",
          "# @effect/sql-pg 4.0.1\n\n- Fix the pool leak.",
        ),
        0,
      ),
      chunk(
        changelogChunk(
          "4.0.0-rc.9",
          "# @effect/sql-pg 4.0.0-rc.9\n\n- Add a client.",
        ),
        1,
      ),
      chunk(
        changelogChunk("4.0.1", "# @effect/sql-pg 4.0.1\n\n- Second part."),
        2,
      ),
    ])
    assert.lengthOf(results, 1)
    const [page] = results
    assert.strictEqual(page?.kind, "changelog")
    if (page?.kind !== "changelog") return
    assert.deepInclude(page, {
      packageName: "@effect/sql-pg",
      packageSlug: "sql-pg",
      version: "v4",
      href: "/docs/v4/api/sql-pg/changelog",
    })
    assert.deepStrictEqual(
      page.chunks.map(({ href, title }) => [href, title]),
      [
        ["/docs/v4/api/sql-pg/changelog#4.0.1", "4.0.1"],
        ["/docs/v4/api/sql-pg/changelog#4.0.0-rc.9", "4.0.0-rc.9"],
      ],
    )
    assert.strictEqual(page.chunks[0]?.snippet, "Fix the pool leak.")
  })

  test("groups documentation sections under their parent heading", () => {
    const results = group([
      chunk(markdownChunk("documentation", "Layers"), 0),
      chunk(markdownChunk("documentation", "Overview"), 1),
    ])
    assert.lengthOf(results, 1)
    const [page] = results
    assert.strictEqual(page?.kind, "documentation")
    assert.strictEqual(page?.href, "/docs/v4/guides/services#overview")
    // The hit on the parent heading itself adds no chunk.
    assert.deepStrictEqual(
      page?.chunks.map(({ href }) => href),
      ["/docs/v4/guides/services#layers"],
    )
  })

  test("keeps a documentation result for a hit on its own heading", () => {
    const results = group([
      chunk(markdownChunk("documentation", "Overview"), 0),
    ])
    assert.lengthOf(results, 1)
    assert.lengthOf(results[0]?.chunks ?? [], 0)
  })

  test("groups blog sections and ignores headings without an anchor", () => {
    const results = group([
      chunk(markdownChunk("blog", "Intro"), 0),
      chunk(markdownChunk("blog", "Empty"), 1),
    ])
    assert.lengthOf(results, 1)
    const [post] = results
    assert.strictEqual(post?.kind, "blog")
    assert.deepStrictEqual(
      post?.chunks.map(({ href }) => href),
      ["/blog/post#intro"],
    )
  })

  test("keeps results of different kinds apart, in order of first match", () => {
    const results = group([
      chunk(changelogChunk("4.0.1", "- Fix."), 0),
      chunk(apiChunk("run"), 1),
      chunk(markdownChunk("blog", "Intro"), 2),
    ])
    assert.deepStrictEqual(
      results.map(({ kind }) => kind),
      ["changelog", "api-reference", "blog"],
    )
  })
})
