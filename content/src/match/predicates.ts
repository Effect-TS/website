import { Match } from "effect"

const match = Match.type<{ age: number }>().pipe(
  Match.when({ age: (age) => age >= 5 }, (user) => `Age: ${user.age}`),
  Match.orElse((user) => `${user.age} is too young`)
)

console.log(match({ age: 5 })) // Output: "Age: 5"
console.log(match({ age: 4 })) // Output: "4 is too young"
