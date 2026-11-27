import { assert, describe, test } from "vite-plus/test"
import {
  type CardFix,
  groupFixes,
  parseMessage,
} from "../../../src/features/scratchpad/diagnostic-card.ts"

const fix = (title: string, preferred = false): CardFix => ({
  title,
  preferred,
  apply: () => {},
})

describe("parseMessage", () => {
  test("splits off the Effect rule and labels it", () => {
    const parsed = parseMessage(
      "This Effect value is neither yielded nor used in an assignment. effect(floatingEffect)",
      377001,
    )
    assert.deepStrictEqual(
      { text: parsed.text, label: parsed.label, title: parsed.rule?.title },
      {
        text: "This Effect value is neither yielded nor used in an assignment.",
        label: "effect · floatingEffect",
        title: "Floating effect",
      },
    )
  })

  test("labels a TypeScript error by its code, with no rule", () => {
    const parsed = parseMessage(
      "Type 'string' is not assignable to type 'number'.",
      2322,
    )
    assert.deepStrictEqual(
      { label: parsed.label, rule: parsed.rule },
      { label: "TS2322", rule: undefined },
    )
  })
})

test("groupFixes puts the preferred real fix first and the disables under Ignore", () => {
  const grouped = groupFixes([
    fix("Disable floatingEffect for this line", true),
    fix("Wrap with Effect.gen"),
    fix("Add yield* statement", true),
    fix("Disable floatingEffect for entire file"),
  ])
  assert.deepStrictEqual(
    {
      primary: grouped.primary?.title,
      others: grouped.others.map((f) => f.title),
      ignores: grouped.ignores.map((f) => f.title),
    },
    {
      primary: "Add yield* statement",
      others: ["Wrap with Effect.gen"],
      ignores: [
        "Disable floatingEffect for this line",
        "Disable floatingEffect for entire file",
      ],
    },
  )
})
