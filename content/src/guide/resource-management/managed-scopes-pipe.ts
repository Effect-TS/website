import { Effect, Console } from "effect"

// $ExpectType Effect<Scope, never, void>
const task1 = Console.log("task 1").pipe(
  Effect.tap(() =>
    Effect.addFinalizer(() => Console.log("finalizer after task 1"))
  )
)

// $ExpectType Effect<Scope, never, void>
const task2 = Console.log("task 2").pipe(
  Effect.tap(() =>
    Effect.addFinalizer(() => Console.log("finalizer after task 2"))
  )
)

// $ExpectType Effect<Scope, never, void>
const program =
  // Both of these scopes are merged into one
  Effect.all([task1, task2], { discard: true })

Effect.runPromise(program.pipe(Effect.scoped))
/*
Output:
task 1
task 2
finalizer after task 2
finalizer after task 1
*/
