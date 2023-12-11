import { Match } from "effect"

// $ExpectType (u: { a: number; } | { b: string; }) => string | number
const match = Match.type<{ a: number } | { b: string }>().pipe(
  Match.when({ a: Match.number }, (_) => _.a),
  Match.when({ b: Match.string }, (_) => _.b),
  Match.exhaustive
)

console.log(match({ a: 0 })) // Output: 0
console.log(match({ b: "hello" })) // Output: "hello"
