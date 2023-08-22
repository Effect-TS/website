import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { RecipeLive } from "./Recipe"

// $ExpectType Layer<MeasuringCup, never, Sugar | Flour>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// $ExpectType Layer<never, never, MeasuringCup | Recipe>
const MainLive = RecipeLive.pipe(
  Layer.use(IngredientsLive), // provides the ingredients to the recipe
  Layer.useMerge(MeasuringCupLive) // provides the MeasuringCup to the recipe
)
