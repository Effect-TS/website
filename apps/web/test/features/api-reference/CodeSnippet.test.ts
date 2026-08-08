import { assert, test } from "vite-plus/test"
import { CodeSnippet } from "../../../src/features/api-reference/CodeSnippet.ts"

test("quotes TypeDoc property names that are not valid TypeScript syntax", () => {
  assert.equal(CodeSnippet.typescriptPropertyName("value"), "value")
  assert.equal(CodeSnippet.typescriptPropertyName("[TypeId]"), "[TypeId]")
  assert.equal(
    CodeSnippet.typescriptPropertyName("~effect/LayerRef"),
    '"~effect/LayerRef"',
  )
})
