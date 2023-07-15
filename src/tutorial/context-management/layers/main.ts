import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"

// Layer<MeasuringCup, never, Flour | Sugar>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)
