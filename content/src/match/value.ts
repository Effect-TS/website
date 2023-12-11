import { Match } from "effect"

// $ExpectType string
const result = Match.value({ name: "John", age: 30 }).pipe(
  Match.when(
    { name: "John" },
    (user) => `${user.name} is ${user.age} years old`
  ),
  Match.orElse(() => "Oh, not John")
)

console.log(result) // Output: "John is 30 years old"
