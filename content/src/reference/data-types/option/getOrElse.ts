import { Option } from "effect"

Option.getOrElse(Option.some(5), () => 0) // 5
Option.getOrElse(Option.none(), () => 0) // 0
