import { Effect } from "effect"
import { constVoid } from "effect/Function"

// $ExpectType Effect<number, string, never>
const task = Effect.fail("Uh oh!").pipe(Effect.as(5))

// $ExpectType Effect<void, never, never>
const program = Effect.match(task, {
  onFailure: constVoid,
  onSuccess: constVoid
})
