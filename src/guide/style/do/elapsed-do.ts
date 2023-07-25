import { Effect } from "effect"

// Get the current timestamp
const now = Effect.sync(() => new Date().getTime())

const elapsed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  Effect.Do.pipe(
    Effect.bind("startMillis", () => now),
    Effect.bind("result", () => self),
    Effect.bind("endMillis", () => now),
    Effect.let(
      "elapsed",
      ({ startMillis, endMillis }) => endMillis - startMillis // Calculate the elapsed time in milliseconds
    ),
    Effect.tap(({ elapsed }) => Effect.log(`Elapsed: ${elapsed}`)), // Log the elapsed time
    Effect.map(({ result }) => result)
  )

// Simulates a successful computation with a delay of 200 milliseconds
const task = Effect.succeed("some task").pipe(Effect.delay("200 millis"))

const program = elapsed(task)

Effect.runPromise(program).then(console.log)
/*
... message="Elapsed: 204"
some task
*/
