import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { RecipeLive } from "./Recipe"

// $ExpectType Layer<Sugar | Flour, never, MeasuringCup>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// $ExpectType Layer<Recipe, never, never>
const MainLive = RecipeLive.pipe(
  Layer.provide(IngredientsLive), // provides the ingredients to the recipe
  Layer.provide(MeasuringCupLive) // provides the MeasuringCup to the ingredients
)
