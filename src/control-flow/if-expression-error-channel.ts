import { Effect } from "effect"

const validateWeightOrFail = (
  weight: number
): Effect.Effect<number, string> => {
  if (weight >= 0) {
    return Effect.succeed(weight)
  } else {
    return Effect.fail(`negative input: ${weight}`)
  }
}
