import * as Schema from "effect/Schema"
import assert from "node:assert/strict"
import test from "node:test"
import { StoreSearchResponse } from "./domain.ts"

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
          file_hash: "sha256:e8efc3256a8af23cf3575322cec52a18086deb2146a921bc0ee242052f69926c",
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
