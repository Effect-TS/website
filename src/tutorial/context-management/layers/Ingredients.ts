import { Effect, Context, Layer } from "effect"
import { MeasuringCup } from "./MeasuringCup"

// Sugar

export interface Sugar {
  readonly grams: (amount: number) => Effect.Effect<never, never, string>
}

export const Sugar = Context.Tag<Sugar>()

// Layer<MeasuringCup, never, Sugar>
export const SugarLive = Layer.effect(
  Sugar,
  Effect.map(MeasuringCup, (measuringCup) =>
    Sugar.of({
      grams: (amount) => measuringCup.measure(amount, "gram"),
    })
  )
)

// Flour

export interface Flour {
  readonly cups: (amount: number) => Effect.Effect<never, never, string>
}

export const Flour = Context.Tag<Flour>()

// Layer<MeasuringCup, never, Flour>
export const FlourLive = Layer.effect(
  Flour,
  Effect.map(MeasuringCup, (measuringCup) =>
    Flour.of({
      cups: (amount) => measuringCup.measure(amount, "cup"),
    })
  )
)
