import { Option } from "effect"

// $ExpectType Option<never>
const noValue = Option.none() // An Option holding no value
