import { Either } from "effect"

// $ExpectType Either<string, never>
const leftValue = Either.left("not a number")
