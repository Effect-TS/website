import { Match } from "effect"

const match = Match.type<string | number>().pipe(
  Match.not("hi", (_) => "a"),
  Match.orElse(() => "b")
)

console.log(match("hello")) // Output: "a"
console.log(match("hi")) // Output: "b"
