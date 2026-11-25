import { javascript } from "@codemirror/lang-javascript"
import { ensureSyntaxTree } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { assert, describe, test } from "vite-plus/test"
import { monacoTokenClasses } from "../../../src/features/scratchpad/monaco-tokens.ts"

const tokens = (doc: string, from = 0, to = doc.length) => {
  const state = EditorState.create({
    doc,
    extensions: javascript({ typescript: true }),
  })
  ensureSyntaxTree(state, state.doc.length, 5000)
  return monacoTokenClasses(state, from, to).map(
    (token) => `${doc.slice(token.from, token.to)} ${token.className}`,
  )
}

describe("monacoTokenClasses", () => {
  test("colors capitalized identifiers as types, wherever they appear", () => {
    assert.deepStrictEqual(tokens("const x: User = Effect.Schema.make"), [
      "User cm-monaco-type",
      "Effect cm-monaco-type",
      "Schema cm-monaco-type",
    ])
  })

  test("colors identifiers on Monaco's keyword list as keywords", () => {
    assert.deepStrictEqual(tokens("let a: string | undefined"), [
      "string cm-monaco-keyword",
      "undefined cm-monaco-keyword",
    ])
  })

  test("colors brackets by nesting depth across bracket kinds", () => {
    assert.deepStrictEqual(tokens("f([{ a: (1) }])"), [
      "( cm-monaco-bracket-0",
      "[ cm-monaco-bracket-1",
      "{ cm-monaco-bracket-2",
      "( cm-monaco-bracket-0",
      ") cm-monaco-bracket-0",
      "} cm-monaco-bracket-2",
      "] cm-monaco-bracket-1",
      ") cm-monaco-bracket-0",
    ])
  })

  test("keeps the depth of brackets before the range", () => {
    const doc = "f(\n  g(1)\n)"
    assert.deepStrictEqual(tokens(doc, doc.indexOf("g"), doc.length), [
      "( cm-monaco-bracket-1",
      ") cm-monaco-bracket-1",
      ") cm-monaco-bracket-0",
    ])
  })

  test("treats the star in function* and yield* as a delimiter", () => {
    assert.deepStrictEqual(
      tokens("function* g() { yield* x }").filter((t) => t.startsWith("*")),
      ["* cm-monaco-delimiter", "* cm-monaco-delimiter"],
    )
  })
})
