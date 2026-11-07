import { Effect, Schema } from "effect"

export const PointerSchema = Schema.Literals(["Away", "Over", "Pressed"])

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
