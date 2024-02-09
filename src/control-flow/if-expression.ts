import { Effect, Option } from "effect"

const validateWeightOption = (
  weight: number
): Effect.Effect<Option.Option<number>> => {
  if (weight >= 0) {
    return Effect.succeed(Option.some(weight))
  } else {
    return Effect.succeed(Option.none())
  }
}
