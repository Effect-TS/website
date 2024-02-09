import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"
import { MeasuringCupLive } from "./MeasuringCup"
import { RecipeLive } from "./Recipe"

// $ExpectType Layer<Sugar | Flour, never, MeasuringCup>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)

// $ExpectType Layer<Recipe, never, MeasuringCup>
const RecipeDraft = RecipeLive.pipe(Layer.provide(IngredientsLive)) // provides the ingredients to the recipe

// $ExpectType Layer<MeasuringCup | Recipe, never, never>
const MainLive = RecipeDraft.pipe(Layer.provideMerge(MeasuringCupLive)) // provides the MeasuringCup to the recipe
