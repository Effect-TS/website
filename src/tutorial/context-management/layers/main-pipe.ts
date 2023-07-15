import { Effect, Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { Recipe, RecipeLive } from "./Recipe"

// Layer<MeasuringCup, never, Flour | Sugar>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// Layer<never, never, Recipe>
const MainLive = MeasuringCupLive.pipe(
  Layer.provide(IngredientsLive),
  Layer.provide(RecipeLive)
)

// Effect<Recipe, never, void>
const program = Recipe.pipe(
  Effect.flatMap((recipe) => recipe.steps),
  Effect.flatMap((steps) =>
    Effect.forEach(steps, (step) => Effect.log(step), {
      concurrency: "unbounded",
      discard: true,
    })
  )
)

// Effect<never, never, void>
const runnable = Effect.provideLayer(program, MainLive)

Effect.runPromise(runnable)

// ...more output... message="Measured 200 gram(s)"
// ...more output... message="Measured 1 cup(s)"
