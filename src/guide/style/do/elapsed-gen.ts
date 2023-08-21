import { Effect } from "effect"

// Get the current timestamp
const now = Effect.sync(() => new Date().getTime())

// Prints the elapsed time occurred to `self` to execute
const elapsed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  Effect.gen(function* (_) {
    const startMillis = yield* _(now)
    const result = yield* _(self)
    const endMillis = yield* _(now)
    // Calculate the elapsed time in milliseconds
    const elapsed = endMillis - startMillis
    // Log the elapsed time
    console.log(`Elapsed: ${elapsed}`)
    return result
  })

// Simulates a successful computation with a delay of 200 milliseconds
const task = Effect.succeed("some task").pipe(Effect.delay("200 millis"))

const program = elapsed(task)

Effect.runPromise(program).then(console.log)
/*
Output:
Elapsed: 204
some task
*/
