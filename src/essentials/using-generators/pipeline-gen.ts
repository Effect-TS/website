import { Effect } from "effect"

const increment = (x: number) => x + 1

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType Effect<never, Error, string>
const program = Effect.gen(function* (_) {
  const [a, b] = yield* _(Effect.all([Effect.succeed(10), Effect.succeed(2)]))
  const n1 = yield* _(divide(a, b))
  const n2 = increment(n1)
  return `Result is: ${n2}`
})

console.log(Effect.runSync(program)) // Output: "Result is: 6"
