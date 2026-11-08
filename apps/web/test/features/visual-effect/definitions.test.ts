import { settle, start } from "./run.ts"
import { Option } from "effect"
import { expect, test } from "vite-plus/test"
import {
  describe,
  idle,
  isNotificationVisible,
  isShownOn,
  type NodeTarget,
} from "../../../src/features/visual-effect/program/domain.ts"
import { glitchText } from "../../../src/features/visual-effect/program/view/node.ts"
import { EXAMPLES_CATALOG } from "../../../src/features/visual-effect/catalog/index.ts"
import { allExample } from "../../../src/features/visual-effect/catalog/effect-all.tsx"
import { EmojiResult } from "../../../src/features/visual-effect/ui/results/emoji.tsx"
import { ErrorResult } from "../../../src/features/visual-effect/ui/results/error.tsx"
import { PrimitiveResult } from "../../../src/features/visual-effect/ui/results/primitive.tsx"
import {
  TemperatureArrayResult,
  TemperatureResult,
} from "../../../src/features/visual-effect/ui/results/temperature.tsx"

test("a result shows as data the view can render", () => {
  expect(new EmojiResult("Tortoise").display()).toEqual({
    size: "Large",
    text: "🐢",
  })
  expect(new ErrorResult(new Error("boom")).display()).toEqual({
    size: "Small",
    text: "boom",
  })
  expect(new PrimitiveResult(42).display()).toEqual({
    size: "Small",
    text: "42",
  })
  expect(new TemperatureResult(65).display()).toEqual({
    size: "Small",
    text: "65°",
  })
  expect(
    new TemperatureArrayResult([
      new TemperatureResult(65),
      new TemperatureResult(44),
    ]).display(),
  ).toEqual({ size: "Small", text: "[65°, 44°]" })
})

test("a control lists the options a view shows", () => {
  const [concurrency] = allExample.controls
  expect(concurrency?.id).toBe("concurrency")
  expect(concurrency?.options).toEqual(["sequential", "numbered", "unbounded"])
  expect(concurrency?.initialValue).toBe("sequential")
})

test("the snippet follows the control values it is given", () => {
  expect(allExample.code.resolve({}).source).toContain(
    "Effect.all([nyc, berlin, tokyo, london])",
  )
  expect(
    allExample.code.resolve({ concurrency: "unbounded" }).source,
  ).toContain('concurrency: "unbounded"')
})

test("every control starts on one of its options", () => {
  for (const { examples } of Object.values(EXAMPLES_CATALOG)) {
    for (const example of examples) {
      for (const control of example.controls) {
        expect(control.options).toContain(control.initialValue)
      }
    }
  }
})

const notification = {
  id: 3,
  message: "hi",
  durationMs: 2000,
  showOnHover: false,
}

test("a notification shows until it expires, and comes back on hover only when it may", () => {
  expect(isNotificationVisible(notification, [], false)).toBe(true)
  expect(isNotificationVisible(notification, [3], false)).toBe(false)
  expect(isNotificationVisible(notification, [3], true)).toBe(false)
  expect(
    isNotificationVisible({ ...notification, showOnHover: true }, [3], true),
  ).toBe(true)
  expect(
    isNotificationVisible({ ...notification, showOnHover: true }, [3], false),
  ).toBe(false)
})

test("hovering a node brings back its own expired notification only", () => {
  const hoverable = { ...notification, showOnHover: true }
  const model = (hovered: boolean) => ({
    expiredNotifications: [3],
    maybeHovered: hovered
      ? Option.some<NodeTarget>({ _tag: "Result" })
      : Option.none<NodeTarget>(),
  })
  expect(isShownOn(model(true), { _tag: "Result" }, hoverable)).toBe(true)
  expect(isShownOn(model(false), { _tag: "Result" }, hoverable)).toBe(false)
  expect(isShownOn(model(true), { _tag: "Step", index: 0 }, hoverable)).toBe(
    false,
  )
})

test("a death notification garbles the same way every time, and between 6 and 16 characters", () => {
  expect(glitchText(notification)).toBe(glitchText(notification))
  expect(glitchText(notification)).toHaveLength(6)
  expect(glitchText({ ...notification, message: "x".repeat(40) })).toHaveLength(
    16,
  )
  expect(glitchText({ ...notification, id: 4 })).not.toBe(
    glitchText(notification),
  )
})

test("a screen reader hears each state in words", () => {
  const shown = { size: "Small", text: "65°" } as const
  expect(describe(idle)).toBe("not run")
  expect(describe(start(0))).toBe("running")
  expect(
    describe(settle(start(0), { _tag: "Succeeded", value: shown }, 1)),
  ).toBe("succeeded with 65°")
  expect(describe(settle(start(0), { _tag: "Failed", error: shown }, 1))).toBe(
    "failed with 65°",
  )
  expect(describe(settle(start(0), { _tag: "Interrupted" }, 1))).toBe("stopped")
  expect(describe(settle(start(0), { _tag: "Died", defect: shown }, 1))).toBe(
    "died with 65°",
  )
})
