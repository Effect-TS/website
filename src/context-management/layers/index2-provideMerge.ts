import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { RecipeLive } from "./Recipe"

// $ExpectType Layer<MeasuringCup, never, Sugar | Flour>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// $ExpectType Layer<MeasuringCup, never, Recipe>
const RecipeDraft = IngredientsLive.pipe(Layer.provide(RecipeLive)) // provides the ingredients to the recipe

// $ExpectType Layer<never, never, MeasuringCup | Recipe>
const MainLive = MeasuringCupLive.pipe(Layer.provideMerge(RecipeDraft)) // provides the MeasuringCup to the recipe
