import { expect, test } from "vite-plus/test"
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
