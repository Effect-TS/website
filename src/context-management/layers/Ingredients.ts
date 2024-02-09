import { Effect, Context, Layer } from "effect"
import { MeasuringCup } from "./MeasuringCup"

// Sugar

export class Sugar extends Context.Tag("Sugar")<
  Sugar,
  {
    readonly grams: (amount: number) => Effect.Effect<string>
  }
>() {}

// $ExpectType Layer<Sugar, never, MeasuringCup>
export const SugarLive = Layer.effect(
  Sugar,
  Effect.map(MeasuringCup, (measuringCup) => ({
    grams: (amount) => measuringCup.measure(amount, "gram")
  }))
)

// Flour

export class Flour extends Context.Tag("Flour")<
  Flour,
  {
    readonly cups: (amount: number) => Effect.Effect<string>
  }
>() {}

// $ExpectType Layer<Flour, never, MeasuringCup>
export const FlourLive = Layer.effect(
  Flour,
  Effect.map(MeasuringCup, (measuringCup) => ({
    cups: (amount) => measuringCup.measure(amount, "cup")
  }))
)
