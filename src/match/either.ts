import { Match } from "effect"

// $ExpectType (input: string) => Either<string, number>
const match = Match.type<string>().pipe(
  Match.when("hi", (_) => _.length),
  Match.either
)

console.log(match("hi")) // Output: { _id: 'Either', _tag: 'Right', right: 2 }
console.log(match("shigidigi")) // Output: { _id: 'Either', _tag: 'Left', left: 'shigidigi' }
