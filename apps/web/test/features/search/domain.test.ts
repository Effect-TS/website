import * as Schema from "effect/Schema"
import { assert, test } from "vite-plus/test"
import {
  ChangelogGeneratedMetadata,
  ChangelogMetadata,
  StoreSearchResponse,
} from "../../../src/features/search/domain.ts"

test("decodes search results with unclassified file metadata", () => {
  const response = Schema.decodeUnknownSync(StoreSearchResponse)({
    object: "list",
    data: [
      {
        type: "text",
        model: "mixedbread-ai/mxbai-embed-large-v1",
        text: "Creating effects",
        score: 0.9,
        metadata: {
          synced: true,
          file_hash:
            "sha256:e8efc3256a8af23cf3575322cec52a18086deb2146a921bc0ee242052f69926c",
          file_path: "/content/docs/getting-started/creating-effects.mdx",
          git_branch: "main",
          git_commit: "7333ffed307d2479fc3598d3abc9355adbd86cd6",
          uploaded_at: "2026-01-24T14:37:11.825Z",
        },
        filename: "creating-effects.mdx",
        file_id: "file-id",
        store_id: "store-id",
        chunk_index: 0,
        mime_type: "text/markdown",
        generated_metadata: {},
      },
    ],
  })

  assert.equal(response.data.length, 1)
})

test("decodes changelog chunks with their release metadata", () => {
  const response = Schema.decodeUnknownSync(StoreSearchResponse)({
    object: "list",
    data: [
      {
        type: "text",
        model: "mixedbread-ai/mxbai-embed-large-v1",
        text: "# @effect/sql-pg 4.0.1\n\n- Fix pool leak.",
        score: 0.8,
        metadata: {
          synced: true,
          file_hash: "abc",
          channel: "v4",
          content_source: "changelog",
          git_branch: "main",
          git_commit: "7333ffed307d2479fc3598d3abc9355adbd86cd6",
          package_name: "@effect/sql-pg",
          package_slug: "sql-pg",
          uploaded_at: "2026-01-24T14:37:11.825Z",
          version: 4,
        },
        filename: "sql-pg-changelog-001.mxjson",
        file_id: "file-id",
        store_id: "store-id",
        chunk_index: 0,
        mime_type: "text/plain",
        generated_metadata: {
          type: "text",
          page_href: "/docs/v4/api/sql-pg/changelog",
          version: "4.0.1",
        },
      },
    ],
  })

  const [chunk] = response.data
  assert.equal(chunk?.metadata && "content_source" in chunk.metadata, true)
  assert.equal(
    Schema.is(ChangelogMetadata)(chunk?.metadata) &&
      Schema.is(ChangelogGeneratedMetadata)(chunk?.generated_metadata),
    true,
  )
})
