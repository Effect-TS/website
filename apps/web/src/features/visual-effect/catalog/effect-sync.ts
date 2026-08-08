import * as Effect from "effect/Effect"
import { defineExample } from "../model/define-example"
import { HighlightSelector } from "../model/snippet-definition"
import { PrimitiveResult } from "../ui/results/primitive"

export const syncExample = defineExample({
  label: "Effect.sync",
  description: "Create an effect from a synchronous side-effectful computation",
  code: {
    language: "typescript",
    source: "const random = Effect.sync(() => Math.random())",
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.sync(() => Math.random())",
  }),
  build: () => Effect.sync(() => new PrimitiveResult(Math.random())),
})
