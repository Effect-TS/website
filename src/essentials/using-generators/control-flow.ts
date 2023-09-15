import { Effect } from "effect"

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

const program = Effect.gen(function* (_) {
  let i = 1

  while (true) {
    if (i === 10) {
      break
    } else {
      if (i % 2 === 0) {
        console.log(yield* _(divide(12, i)))
      }
      i++
      continue
    }
  }
})

Effect.runPromise(program)
/*
Output:
6
3
2
1.5
*/
