import { Effect } from "effect"
import { constVoid } from "effect/Function"

// $ExpectType Effect<never, string, number>
const task = Effect.fail("Uh oh!").pipe(Effect.as(5))

// $ExpectType Effect<never, never, void>
const program = Effect.match(task, {
  onFailure: constVoid,
  onSuccess: constVoid
})
