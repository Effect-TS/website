import { Either } from "effect"

// $ExpectType Either<never, number>
const rightValue = Either.right(42)
