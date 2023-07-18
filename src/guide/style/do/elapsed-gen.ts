import { Effect } from "effect"

const now = Effect.sync(() => new Date().getTime())

// Prints the elapsed time occurred to `self` to execute
const elapsed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  Effect.gen(function* (_) {
    const startMillis = yield* _(now)
    const result = yield* _(self)
    const endMillis = yield* _(now)
    yield* _(Effect.log(`Elapsed: ${endMillis - startMillis}`))
    return result
  })

const program = Effect.succeed("some task").pipe(
  Effect.delay("200 millis"),
  elapsed
)

Effect.runPromise(program).then(console.log)
/*
... message="Elapsed: 204"
some task
*/
