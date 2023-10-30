import { Match } from "effect"

const match = Match.type<string | number>().pipe(
  Match.when("hi", (_) => "hello"),
  Match.orElse(() => "I literally do not understand")
)

console.log(match("hi")) // Output: "hello"
console.log(match("hello")) // Output: "I literally do not understand"
