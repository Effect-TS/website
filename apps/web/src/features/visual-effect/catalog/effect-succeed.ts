import * as Effect from "effect/Effect"
import { defineExample } from "../model/define-example"
import { PrimitiveResult } from "../ui/results/primitive"

export const succeedExample = defineExample({
  label: "Effect.succeed",
  description: "Create an effect that always succeeds with a given value",
  code: {
    language: "typescript",
    source: "const value = Effect.succeed(42)",
  },
  resultHighlight: {
    _tag: "Text",
    text: "Effect.succeed(42)",
  },
  build: () => Effect.succeed(new PrimitiveResult(42)),
})
