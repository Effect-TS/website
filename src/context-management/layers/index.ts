import { Layer } from "effect"
import { FlourLive, SugarLive } from "./Ingredients"

// $ExpectType Layer<Sugar | Flour, never, MeasuringCup>
const IngredientsLive = Layer.merge(FlourLive, SugarLive)
