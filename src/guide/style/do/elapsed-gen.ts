import { Effect } from "effect"

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
            Effect.flatMap((endMillis) =>
              Effect.log(`Elapsed: ${endMillis - startMillis}`).pipe(
                Effect.map(() => result)
              )
            )
          )
        )
      )
    )
  )

const program = Effect.succeed("some task").pipe(
  Effect.delay("200 millis"),
  elapsed
)

Effect.runPromise(program).then(console.log)
/*
... message="Elapsed: 204"
some task
*/
