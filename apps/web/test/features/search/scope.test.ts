import { assert, test } from "vite-plus/test"
import { searchScope } from "../../../src/features/search/scope.ts"

test("searches production alone outside previews", () => {
  assert.deepEqual(searchScope({ production: "prod" }), {
    store_identifiers: ["prod"],
  })
})

test("searches production and the preview store, hiding replaced production files", () => {
  assert.deepEqual(
    searchScope({
      production: "prod",
      overlay: { id: "pr-1", metadata: { hidden_files_0: "b,a" } },
    }),
    {
      store_identifiers: ["prod", "pr-1"],
      file_ids: ["not_in", ["a", "b"]],
    },
  )
})

test("omits the file filter when the preview hides nothing", () => {
  assert.deepEqual(
    searchScope({
      production: "prod",
      overlay: { id: "pr-1", metadata: { lifecycle: "pull-request-preview" } },
    }),
    { store_identifiers: ["prod", "pr-1"] },
  )
})
