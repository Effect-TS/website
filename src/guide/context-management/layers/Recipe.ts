import { Effect, Context, Layer } from "effect"
import { Flour, Sugar } from "./Ingredients"

export interface Recipe {
  readonly steps: Effect.Effect<never, never, ReadonlyArray<string>>
}

export const Recipe = Context.Tag<Recipe>()

// $ExpectType Layer<Sugar | Flour, never, Recipe>
export const RecipeLive = Layer.effect(
  Recipe,
  Effect.map(Effect.all([Sugar, Flour]), ([sugar, flour]) =>
    Recipe.of({
      steps: Effect.all([sugar.grams(200), flour.cups(1)]),
    })
  )
)
