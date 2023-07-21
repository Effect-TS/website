import { Option } from "effect"

Option.getOrThrow(Option.some(10)) // Output: 10
Option.getOrThrow(Option.none()) // throws Error("getOrThrow called on a None")
