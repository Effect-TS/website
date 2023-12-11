import { Effect, Layer, Console } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { Recipe, RecipeLive } from "./Recipe"

// $ExpectType Layer<MeasuringCup, never, Sugar | Flour>
const IngredientsLive = Layer.merge(SugarLive, FlourLive)

// $ExpectType Layer<never, never, Recipe>
const MainLive = RecipeLive.pipe(
    Layer.provide(IngredientsLive),
    Layer.provide(MeasuringCupLive)
)

// $ExpectType Effect<Recipe, never, void>
const program = Recipe.pipe(
  Effect.flatMap((recipe) => recipe.steps),
  Effect.flatMap((steps) =>
    Effect.forEach(steps, (step) => Console.log(step), {
      concurrency: "unbounded",
      discard: true
    })
  )
)

// $ExpectType Effect<never, never, void>
const runnable = Effect.provide(program, MainLive)

Effect.runPromise(runnable)
/*
Output:
Measured 200 gram(s)
Measured 1 cup(s)
*/
