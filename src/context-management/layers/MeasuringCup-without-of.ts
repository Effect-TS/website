import { Effect, Context, Layer } from "effect"

export interface MeasuringCup {
  readonly measure: (
    amount: number,
    unit: string
  ) => Effect.Effect<never, never, string>
}

export const MeasuringCup = Context.Tag<MeasuringCup>()

export const MeasuringCupLive = Layer.succeed(MeasuringCup, {
  measure: (amount, unit) => Effect.succeed(`Measured ${amount} ${unit}(s)`)
})
