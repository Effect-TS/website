import assert from "node:assert/strict"
import test from "node:test"
import { CodeSnippet } from "./CodeSnippet.ts"

test("formats TypeScript signatures to 100 columns", async () => {
  const result = await CodeSnippet.formatSignature(
    "declare function run<A, E, R>(effect: Effect<ReadonlyArray<A>, VeryLongErrorType, VeryLongRequirementType>, options: { readonly concurrency: number; readonly batching: boolean }): Promise<ReadonlyArray<A>>",
  )

  assert.equal(result.status, "formatted")
  assert.ok(result.code.includes("\n"))
  assert.ok(result.code.split("\n").every((line) => line.length <= 100))
})

test("preserves snippets that are intentional pseudo-code", async () => {
  const source = "[Semigroup<A>, Semigroup<B>, ...] -> Semigroup<[A, B, ...]>"
  const result = await CodeSnippet.formatExample(source, "typescript")

  assert.equal(result.status, "invalid")
  assert.equal(result.code, source)
  assert.ok(result.errors.length > 0)
})

test("quotes TypeDoc property names that are not valid TypeScript syntax", () => {
  assert.equal(CodeSnippet.typescriptPropertyName("value"), "value")
  assert.equal(CodeSnippet.typescriptPropertyName("[TypeId]"), "[TypeId]")
  assert.equal(CodeSnippet.typescriptPropertyName("~effect/LayerRef"), '"~effect/LayerRef"')
})
