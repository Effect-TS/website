import { Effect } from "effect"

const increment = (x: number) => x + 1

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0 ? Effect.fail(new Error("Cannot divide by zero")) : Effect.succeed(a / b)

// $ExpectType Effect<never, never, number>
const task1 = Effect.promise(() => Promise.resolve(10))
// $ExpectType Effect<never, never, number>
const task2 = Effect.promise(() => Promise.resolve(2))

// $ExpectType Effect<never, Error, string>
export const program = Effect.gen(function* (_) {
  const a = yield* _(task1)
  const b = yield* _(task2)
  const n1 = yield* _(divide(a, b))
  const n2 = increment(n1)
  return `Result is: ${n2}`
})

Effect.runPromise(program).then(console.log) // Output: "Result is: 6"
