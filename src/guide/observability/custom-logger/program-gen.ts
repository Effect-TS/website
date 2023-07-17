import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.gen(function* (_) {
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.log("task1 done", "Debug"))
})

// $ExpectType Effect<never, never, void>
const task2 = Effect.gen(function* (_) {
  yield* _(Effect.sleep("1 seconds"))
  yield* _(Effect.log("task2 done", "Debug"))
})

// $ExpectType Effect<never, never, void>
export const program = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(task1)
  yield* _(task2)
  yield* _(Effect.log("done"))
})
