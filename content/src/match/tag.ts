import { Match, Either } from "effect"

const match = Match.type<Either.Either<string, number>>().pipe(
  Match.tag("Right", (_) => _.right),
  Match.tag("Left", (_) => _.left),
  Match.exhaustive
)

console.log(match(Either.right(123))) // Output: 123
console.log(match(Either.left("Oh no!"))) // Output: "Oh no!"
