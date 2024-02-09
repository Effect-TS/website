import { Effect, Context, Layer } from "effect"

// Create a tag for the MeasuringCup service
export class MeasuringCup extends Context.Tag("MeasuringCup")<
  MeasuringCup,
  {
    readonly measure: (amount: number, unit: string) => Effect.Effect<string>
  }
>() {}

// $ExpectType Layer<MeasuringCup, never, never>
export const MeasuringCupLive = Layer.succeed(
  MeasuringCup,
  MeasuringCup.of({
    measure: (amount, unit) => Effect.succeed(`Measured ${amount} ${unit}(s)`)
  })
)
