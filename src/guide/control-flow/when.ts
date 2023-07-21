import { Effect, Option } from "effect"

const validateWeightOption = (
  weight: number
): Effect.Effect<never, never, Option.Option<number>> =>
  Effect.succeed(weight).pipe(Effect.when(() => weight >= 0))
