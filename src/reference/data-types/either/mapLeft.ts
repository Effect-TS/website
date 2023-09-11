import { Either } from "effect"

Either.mapLeft(Either.right(1), (s) => s + "!") // right(1)

Either.mapLeft(Either.left("not a number"), (s) => s + "!") // left("not a number!")
