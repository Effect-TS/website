import { assert, describe, test } from "vite-plus/test"
import { formatValue } from "../../../src/features/devtools/components/trace-details.tsx"

describe("formatValue", () => {
  test("quotes strings and leaves numbers and literals bare", () => {
    assert.deepStrictEqual(
      [formatValue('a"b'), formatValue(3), formatValue(null)],
      [
        { kind: "string", text: '"a\\"b"' },
        { kind: "number", text: "3" },
        { kind: "literal", text: "null" },
      ],
    )
  })

  test("indents objects as JSON, bigints included", () => {
    assert.deepStrictEqual(formatValue({ a: [1], b: 2n }), {
      kind: "json",
      text: '{\n  "a": [\n    1\n  ],\n  "b": "2n"\n}',
    })
  })
})
