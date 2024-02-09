import { Effect, Layer, Console } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { Recipe, RecipeLive } from "./Recipe"

// $ExpectType Layer<Sugar | Flour, never, MeasuringCup>
const IngredientsLive = Layer.merge(SugarLive, FlourLive)

// $ExpectType Layer<Recipe, never, never>
const MainLive = RecipeLive.pipe(
  Layer.provide(IngredientsLive),
  Layer.provide(MeasuringCupLive)
)

// $ExpectType Effect<void, never, Recipe>
const program = Effect.gen(function* (_) {
  const recipe = yield* _(Recipe)
  const steps = yield* _(recipe.steps)
  return yield* _(
    Effect.forEach(steps, (step) => Console.log(step), {
      concurrency: "unbounded",
      discard: true
    })
  )
})

// $ExpectType Effect<void, never, never>
const runnable = Effect.provide(program, MainLive)

Effect.runPromise(runnable)
/*
Output:
Measured 200 gram(s)
Measured 1 cup(s)
*/
