import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { RecipeLive } from "./Recipe"

// Layer<MeasuringCup, never, Flour | Sugar>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// Layer<never, never, Recipe>
const MainLive = MeasuringCupLive.pipe(
  Layer.provide(IngredientsLive), // provides the MeasuringCup to the ingredients
  Layer.provide(RecipeLive) // provides the ingredients to the recipe
)
