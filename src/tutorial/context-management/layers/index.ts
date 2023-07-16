import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"

// $ExpectType Layer<MeasuringCup, never, Sugar | Flour>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)
