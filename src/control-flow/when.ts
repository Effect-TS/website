import { Effect, Option } from "effect"

const validateWeightOption = (
  weight: number
): Effect.Effect<Option.Option<number>> =>
  Effect.succeed(weight).pipe(Effect.when(() => weight >= 0))

Effect.runPromise(validateWeightOption(100)).then(console.log)
/*
Output:
{
  _id: "Option",
  _tag: "Some",
  value: 100
}
*/

Effect.runPromise(validateWeightOption(-5)).then(console.log)
/*
Output:
{
  _id: "Option",
  _tag: "None"
}
*/
