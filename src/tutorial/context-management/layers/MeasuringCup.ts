import { Effect, Context, Layer } from "effect"

// Define the interface for the MeasuringCup service
export interface MeasuringCup {
  readonly measure: (
    amount: number,
    unit: string
  ) => Effect.Effect<never, never, string>
}

// Create a tag for the MeasuringCup service
export const MeasuringCup = Context.Tag<MeasuringCup>()

// Layer<never, never, MeasuringCup>
export const MeasuringCupLive = Layer.succeed(
  MeasuringCup,
  MeasuringCup.of({
    measure: (amount, unit) => Effect.succeed(`Measured ${amount} ${unit}(s)`),
  })
)
