import { Effect } from "effect"
import { constVoid } from "effect/Function"

// Effect<never, never, void>
const program = Effect.fail("Uh oh!").pipe(
  Effect.as(5),
  Effect.match({
    onFailure: constVoid,
    onSuccess: constVoid,
  })
)
