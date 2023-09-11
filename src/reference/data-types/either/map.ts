import { Either } from "effect"

Either.map(Either.right(1), (n) => n + 1) // right(2)

Either.map(Either.left("not a number"), (n) => n + 1) // left("not a number")
