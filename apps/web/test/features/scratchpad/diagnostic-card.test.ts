import { assert, describe, test } from "vite-plus/test"
import {
  type CardFix,
  countSummary,
  groupFixes,
  ignoreLabel,
  parseMessage,
} from "../../../src/features/scratchpad/diagnostic-card.ts"
import { ruleTitle } from "../../../src/features/scratchpad/effect-rules.ts"

const fix = (
  title: string,
  preferred = false,
  onApply = () => {},
): CardFix => ({
  title,
  preferred,
  apply: onApply,
})

const FLOATING = {
  severity: "error",
  message:
    "This Effect value is neither yielded nor used in an assignment. effect(floatingEffect)",
  code: 377001,
  fixes: [
    fix("Disable floatingEffect for this line"),
    fix("Disable floatingEffect for entire file"),
    fix("Add yield* statement"),
  ],
}

describe("parseMessage", () => {
  test("splits off the Effect rule and labels it", () => {
    const parsed = parseMessage(FLOATING.message, FLOATING.code)
    assert.strictEqual(
      parsed.text,
      "This Effect value is neither yielded nor used in an assignment.",
    )
    assert.strictEqual(parsed.label, "effect · floatingEffect")
    assert.strictEqual(parsed.rule?.title, "Floating effect")
    assert.include(parsed.rule?.why, "yield*")
    assert.strictEqual(
      parsed.rule?.docs?.path,
      "getting-started/using-generators",
    )
  })

  test("labels a TypeScript error by its code, with no rule", () => {
    const parsed = parseMessage(
      "Type 'string' is not assignable to type 'number'.",
      2322,
    )
    assert.strictEqual(parsed.label, "TS2322")
    assert.isUndefined(parsed.rule)
  })

  test("an Effect rule without our own explanation falls back to its summary", () => {
    const parsed = parseMessage(
      "Use Effect.void. effect(effectSucceedWithVoid)",
      1,
    )
    assert.isUndefined(parsed.rule?.docs)
    assert.match(parsed.rule?.why ?? "", /Effect\.void/)
  })
})

test("ruleTitle turns a camelCase rule into words", () => {
  assert.strictEqual(
    ruleTitle("missingStarInYieldEffectGen"),
    "Missing star in yield effect gen",
  )
})

test("groupFixes puts the preferred real fix first and the disables under Ignore", () => {
  const grouped = groupFixes([
    fix("Disable floatingEffect for this line", true),
    fix("Wrap with Effect.gen"),
    fix("Add yield* statement", true),
    fix("Disable floatingEffect for entire file"),
  ])
  assert.strictEqual(grouped.primary?.title, "Add yield* statement")
  assert.deepEqual(
    grouped.others.map((f) => f.title),
    ["Wrap with Effect.gen"],
  )
  assert.deepEqual(
    grouped.ignores.map((f) => f.title),
    [
      "Disable floatingEffect for this line",
      "Disable floatingEffect for entire file",
    ],
  )
})

test("countSummary counts by severity, errors first", () => {
  assert.deepEqual(
    countSummary([
      { severity: "warning" },
      { severity: "error" },
      { severity: "warning" },
    ]).map((count) => count.text),
    ["1 error", "2 warnings"],
  )
})

test("ignoreLabel shortens the disable fixes", () => {
  assert.strictEqual(
    ignoreLabel("Disable floatingEffect for this line"),
    "Ignore on this line",
  )
  assert.strictEqual(
    ignoreLabel("Disable floatingEffect for entire file"),
    "Ignore in this file",
  )
  assert.strictEqual(
    ignoreLabel("Add yield* statement"),
    "Add yield* statement",
  )
})
