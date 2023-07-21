import { Option } from "effect"

const first = Option.firstSomeOf([
  Option.none(),
  Option.some(2),
  Option.none(),
  Option.some(3),
]) // some(2)
