import { Effect } from "effect"

const validateWeightOrFail = (
  weight: number
): Effect.Effect<never, string, number> => {
  if (weight >= 0) {
    return Effect.succeed(weight)
  } else {
    return Effect.fail(`negative input: ${weight}`)
  }
}
