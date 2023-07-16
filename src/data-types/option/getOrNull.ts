import { Option } from "effect"

Option.getOrNull(Option.some(5)) // Output: 5
Option.getOrNull(Option.none()) // Output: null

Option.getOrUndefined(Option.some(5)) // Output: 5
Option.getOrUndefined(Option.none()) // Output: undefined
