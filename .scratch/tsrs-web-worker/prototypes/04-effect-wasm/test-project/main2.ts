import { Effect } from "effect"

// only a suggestion-level diagnostic plus a directive-suppressed floating Effect
export const unnecessary = Effect.gen(function* () {
  return yield* Effect.succeed(42)
})

export const suppressed = Effect.gen(function* () {
  // @effect-diagnostics-next-line floatingEffect:off
  Effect.log("floating but suppressed")
  return 1
})
