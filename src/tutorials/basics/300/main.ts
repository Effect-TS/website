import { Effect } from "effect"

Effect.succeed(42).pipe(
  Effect.andThen((value) => Effect.log(value)),
  Effect.runPromise
)
