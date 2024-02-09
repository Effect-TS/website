import { Effect } from "effect"

const increment = (x: number) => x + 1

const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType Effect<number, never, never>
const task1 = Effect.promise(() => Promise.resolve(10))
// $ExpectType Effect<number, never, never>
const task2 = Effect.promise(() => Promise.resolve(2))

// $ExpectType Effect<string, Error, never>
const program = Effect.all([task1, task2]).pipe(
  Effect.flatMap(([a, b]) => divide(a, b)),
  Effect.map((n1) => increment(n1)),
  Effect.map((n2) => `Result is: ${n2}`)
)

Effect.runPromise(program).then(console.log) // Output: "Result is: 6"
