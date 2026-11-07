import { Effect, Schema } from "effect"
import type { CardInput, HighlightInput } from "./drivers/layout-animation"
import type { HeaderInput } from "./drivers/header-animation"
import type { NodeTag } from "./drivers/animation"
import { makeRegistry } from "./registry"

export const NodeTagSchema = Schema.Literals([
  "Idle",
  "Running",
  "Succeeded",
  "Failed",
  "Died",
  "Interrupted",
])

export const PointerSchema = Schema.Literals(["Away", "Over", "Pressed"])

/** The drivers that live now. A Mount adds one, and a Command gives it the next input. */
export const nodes = makeRegistry<NodeTag>()
export const header = makeRegistry<HeaderInput>()
export const cards = makeRegistry<CardInput>()
export const highlights = makeRegistry<HighlightInput>()
export const bubbles = makeRegistry<boolean>()

export const HEADER_ID = "header"
export const HIGHLIGHT_ID = "highlight"
export const RESULT_ID = "result"

/** Waits until the render that follows an update has patched the DOM. */
export const afterRender: Effect.Effect<void> = Effect.callback<void>(
  (resume) => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => resume(Effect.void))
    })
    return Effect.sync(() => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    })
  },
)
