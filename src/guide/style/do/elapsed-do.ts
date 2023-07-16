import { Effect } from "effect"

const now = Effect.sync(() => new Date().getTime())

const elapsed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  Effect.Do.pipe(
    Effect.bind("startMillis", () => now),
    Effect.bind("result", () => self),
    Effect.bind("endMillis", () => now),
    Effect.tap(({ startMillis, endMillis }) =>
      Effect.log(`Elapsed: ${endMillis - startMillis}`)
    ),
    Effect.map(({ result }) => result)
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
