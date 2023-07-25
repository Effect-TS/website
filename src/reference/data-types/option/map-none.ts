import { Option } from "effect"

const maybeIncremented = Option.map(Option.none(), (n) => n + 1) // none
