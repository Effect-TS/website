import { assert, describe, test } from "vite-plus/test"
import { Event } from "../../../src/features/devtools/span.ts"
import { formatValue } from "../../../src/features/devtools/components/trace-details.tsx"
import { eventLevel } from "../../../src/features/devtools/components/utils.ts"

const logEvent = (level: string | undefined) =>
  Event.fromEvent({
    _tag: "SpanEvent",
    traceId: "t",
    spanId: "s",
    name: "message",
    startTime: 0n,
    attributes: level === undefined ? undefined : { "effect.logLevel": level },
  })

describe("formatValue", () => {
  test("quotes strings and leaves numbers, booleans and null bare", () => {
    assert.deepStrictEqual(formatValue('a"b'), {
      kind: "string",
      text: '"a\\"b"',
    })
    assert.deepStrictEqual(formatValue(3), { kind: "number", text: "3" })
    assert.deepStrictEqual(formatValue(10n), { kind: "number", text: "10" })
    assert.deepStrictEqual(formatValue(true), { kind: "literal", text: "true" })
    assert.deepStrictEqual(formatValue(null), { kind: "literal", text: "null" })
  })

  test("indents objects as JSON, bigints included", () => {
    assert.deepStrictEqual(formatValue({ a: [1], b: 2n }), {
      kind: "json",
      text: '{\n  "a": [\n    1\n  ],\n  "b": "2n"\n}',
    })
  })

  test("survives values JSON can't serialize", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    assert.deepStrictEqual(formatValue(circular), {
      kind: "json",
      text: "[object Object]",
    })
  })
})

describe("eventLevel", () => {
  test("reads the log level Effect records on log events", () => {
    assert.strictEqual(eventLevel(logEvent("INFO")), "info")
    assert.strictEqual(eventLevel(logEvent("WARN")), "warn")
    assert.strictEqual(eventLevel(logEvent("ERROR")), "error")
    assert.strictEqual(eventLevel(logEvent("FATAL")), "error")
  })

  test("counts events without a level as info", () => {
    assert.strictEqual(eventLevel(logEvent(undefined)), "info")
  })
})
