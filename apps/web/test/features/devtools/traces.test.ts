import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as DevToolsSchema from "effect/devtools/DevToolsSchema"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { assert, describe, test } from "vite-plus/test"
import {
  DevToolsRequest,
  makeTraceAtoms,
  parseDevToolsLine,
  recordDevToolsRequest,
  resetTraces,
} from "../../../src/features/devtools/traces.ts"

const encodeLine = (request: DevToolsSchema.Request) =>
  JSON.stringify(Schema.encodeSync(DevToolsRequest)(request))

const span = (
  traceId: string,
  spanId: string,
  name: string,
  parent?: DevToolsSchema.Span,
): DevToolsSchema.Span => ({
  _tag: "Span",
  traceId,
  spanId,
  name,
  sampled: true,
  attributes: new Map([["source", "test"]]),
  status: {
    _tag: "Ended",
    startTime: 1_000n,
    endTime: 5_000n,
    exit: Exit.void,
  },
  parent: Option.fromNullishOr(parent),
})

/** Feeds proxy lines into a fresh store and returns it. */
const storeWith = (lines: ReadonlyArray<string>) => {
  const registry = AtomRegistry.make()
  const atoms = makeTraceAtoms()
  for (const line of lines) {
    Option.map(parseDevToolsLine(line), (request) =>
      recordDevToolsRequest(registry, atoms, request),
    )
  }
  return { registry, atoms }
}

describe("trace store", () => {
  test("a program's spans form one trace per trace id, newest trace first", () => {
    const program = span("trace-a", "1", "program")
    const { registry, atoms } = storeWith([
      encodeLine(program),
      encodeLine(span("trace-a", "2", "child", program)),
      encodeLine(span("trace-b", "3", "later")),
    ])
    const roots = registry.get(atoms.rootSpansAtom)
    assert.deepStrictEqual(
      roots.map((root) => root.traceId),
      ["trace-b", "trace-a"],
    )
    const traceA = roots[1]!
    assert.equal(traceA.label, "program")
    assert.deepStrictEqual(
      traceA.children.map((child) => child.label),
      ["child"],
    )
    assert.equal(registry.get(atoms.selectedSpanAtom)?.traceId, "trace-b")
  })

  test("pings, blank lines and torn writes are skipped", () => {
    const { registry, atoms } = storeWith([
      encodeLine({ _tag: "Ping" }),
      "",
      '{"_tag":"Span","traceId":"x"',
      "not json",
      encodeLine(span("trace-a", "1", "program")),
    ])
    assert.equal(registry.get(atoms.rootSpansAtom).length, 1)
  })

  test("reset forgets every trace and selects the first trace again", () => {
    const { registry, atoms } = storeWith([
      encodeLine(span("trace-a", "1", "first run")),
      encodeLine(span("trace-b", "2", "first run, second trace")),
    ])
    registry.set(atoms.selectedSpanAtom, 1)
    assert.equal(registry.get(atoms.selectedSpanAtom)?.traceId, "trace-a")

    resetTraces(registry, atoms)
    assert.deepStrictEqual(registry.get(atoms.rootSpansAtom), [])
    assert.isUndefined(registry.get(atoms.selectedSpanAtom))

    // The next Run's first trace is selected, not whatever sat at index 1.
    recordDevToolsRequest(registry, atoms, span("trace-c", "3", "second run"))
    assert.equal(registry.get(atoms.selectedSpanAtom)?.label, "second run")
  })
})
