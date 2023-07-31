import { Effect, Option } from "effect"

const validateWeightOption = (
  weight: number
): Effect.Effect<never, never, Option.Option<number>> =>
  Effect.succeed(weight).pipe(Effect.when(() => weight >= 0))

console.log(Effect.runSync(validateWeightOption(100))) // Output: some(100)

console.log(Effect.runSync(validateWeightOption(-5))) // Output: none()
