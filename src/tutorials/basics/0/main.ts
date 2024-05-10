import { Effect } from "effect"

Effect.log("Welcome to Effect!").pipe(
  Effect.andThen(Effect.log("Effect is awesome!")),
  Effect.runPromise
)
