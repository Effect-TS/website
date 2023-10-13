import { Effect, Console } from "effect"

// $ExpectType Effect<Scope, never, void>
const task1 = Effect.gen(function* (_) {
  console.log("task 1")
  yield* _(Effect.addFinalizer(() => Console.log("finalizer after task 1")))
})

// $ExpectType Effect<Scope, never, void>
const task2 = Effect.gen(function* (_) {
  console.log("task 2")
  yield* _(Effect.addFinalizer(() => Console.log("finalizer after task 2")))
})

// $ExpectType Effect<Scope, never, void>
const program = Effect.gen(function* (_) {
  // Both of these scopes are merged into one
  yield* _(task1)
  yield* _(task2)
})

Effect.runPromise(program.pipe(Effect.scoped))
/*
Output:
task 1
task 2
finalizer after task 2
finalizer after task 1
*/
