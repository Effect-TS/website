import { Effect, Context, Layer } from "effect"
import { Flour, Sugar } from "./Ingredients"

export interface Recipe {
  readonly steps: Effect.Effect<never, never, ReadonlyArray<string>>
}

export const Recipe = Context.Tag<Recipe>()

// Layer<Flour | Sugar, never, Recipe>
export const RecipeLive = Layer.effect(
  Recipe,
  Effect.gen(function* (_) {
    const sugar = yield* _(Sugar)
    const flour = yield* _(Flour)
    return Recipe.of({
      steps: Effect.all([sugar.grams(200), flour.cups(1)]),
    })
  })
)
