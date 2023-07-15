import { Effect, Option } from "effect"

const validateWeightOption = (
  weight: number
): Effect.Effect<never, never, Option.Option<number>> =>
  Effect.when(() => weight >= 0)(Effect.succeed(weight))
