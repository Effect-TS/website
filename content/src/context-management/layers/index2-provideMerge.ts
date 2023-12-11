import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { RecipeLive } from "./Recipe"

// $ExpectType Layer<MeasuringCup, never, Sugar | Flour>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// $ExpectType Layer<MeasuringCup, never, Recipe>
const RecipeDraft = RecipeLive.pipe(Layer.provide(IngredientsLive)) // provides the ingredients to the recipe

// $ExpectType Layer<never, never, MeasuringCup | Recipe>
const MainLive = RecipeDraft.pipe(Layer.provideMerge(MeasuringCupLive)) // provides the MeasuringCup to the recipe
