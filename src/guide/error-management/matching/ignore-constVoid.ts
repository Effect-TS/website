import { Effect } from "effect"
import { constVoid } from "effect/Function"

// $ExpectType Effect<never, string, number>
const myeffect = Effect.fail("Uh oh!").pipe(Effect.as(5))

// $ExpectType Effect<never, never, void>
const program = Effect.match(myeffect, {
  onFailure: constVoid,
  onSuccess: constVoid,
})
