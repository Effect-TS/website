import { Option } from "effect"

Option.fromNullable(null) // none()
Option.fromNullable(undefined) // none()
Option.fromNullable(1) // some(1)
