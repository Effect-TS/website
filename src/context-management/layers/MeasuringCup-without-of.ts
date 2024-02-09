import { Effect, Context, Layer } from "effect"

export class MeasuringCup extends Context.Tag("MeasuringCup")<
  MeasuringCup,
  {
    readonly measure: (amount: number, unit: string) => Effect.Effect<string>
  }
>() {}

export const MeasuringCupLive = Layer.succeed(MeasuringCup, {
  measure: (amount, unit) => Effect.succeed(`Measured ${amount} ${unit}(s)`)
})
