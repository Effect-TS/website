import { Effect, Context, Layer } from "effect"
import { Flour, Sugar } from "./Ingredients"

export class Recipe extends Context.Tag("Recipe")<
  Recipe,
  { readonly steps: Effect.Effect<ReadonlyArray<string>> }
>() {}

// $ExpectType Layer<Recipe, never, Sugar | Flour>
export const RecipeLive = Layer.effect(
  Recipe,
  Effect.all([Sugar, Flour]).pipe(
    Effect.map(([sugar, flour]) => ({
      steps: Effect.all([sugar.grams(200), flour.cups(1)])
    }))
  )
)
