import { Option } from "effect"

Option.getOrThrow(Option.some(10)) // 10
Option.getOrThrow(Option.none()) // throws getOrThrow called on a None
