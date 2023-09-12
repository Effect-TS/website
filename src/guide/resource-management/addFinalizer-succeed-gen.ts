import { Effect, Console } from "effect"

// $ExpectType Effect<Scope, never, number>
const program = Effect.gen(function* (_) {
  yield* _(
    Effect.addFinalizer((exit) => Console.log(`finalizer after ${exit._tag}`))
  )
  return 1
})

// $ExpectType Effect<never, never, number>
const runnable = Effect.scoped(program)

Effect.runPromise(runnable).then(console.log, console.error)
/*
Output:
finalizer after Success
1
*/
