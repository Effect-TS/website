import { Option } from "effect"

Option.getOrNull(Option.some(5)) // 5
Option.getOrNull(Option.none()) // null

Option.getOrUndefined(Option.some(5)) // 5
Option.getOrUndefined(Option.none()) // undefined
