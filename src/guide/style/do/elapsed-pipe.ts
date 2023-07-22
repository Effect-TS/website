import { Effect } from "effect"

// Get the current timestamp
const now = Effect.sync(() => new Date().getTime())

// Prints the elapsed time occurred to `self` to execute
const elapsed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  now.pipe(
    Effect.flatMap((startMillis) =>
      self.pipe(
        Effect.flatMap((result) =>
          now.pipe(
            Effect.flatMap((endMillis) => {
              // Calculate the elapsed time in milliseconds
              const elapsed = endMillis - startMillis
              // Log the elapsed time
              return Effect.log(`Elapsed: ${elapsed}`).pipe(
                Effect.map(() => result)
              )
            })
          )
        )
      )
    )
  )

// Simulates a successful computation with a delay of 200 milliseconds
const task = Effect.succeed("some task").pipe(Effect.delay("200 millis"))

const program = elapsed(task)

Effect.runPromise(program).then(console.log)
/*
... message="Elapsed: 204"
some task
*/
