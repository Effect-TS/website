import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
export const task = Effect.gen(function* (_) {
  yield* _(Effect.sleep("300 millis"))
  return Math.random() > 0.5 ? 2 : yield* _(Effect.fail("Uh oh!"))
})
