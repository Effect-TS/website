import { Option } from "effect"

const maybeIncremented = Option.map(Option.some(1), (n) => n + 1) // some(2)
