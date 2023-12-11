import { Option } from "effect"

// $ExpectType Option<number>
const value = Option.some(1) // An Option holding the number 1
