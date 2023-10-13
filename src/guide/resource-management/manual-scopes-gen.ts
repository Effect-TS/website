import { Console, Effect, Exit, Scope } from "effect"

const task1 = Effect.gen(function* (_) {
  console.log("task 1")
  yield* _(Effect.addFinalizer(() => Console.log("finalizer after task 1")))
})

const task2 = Effect.gen(function* (_) {
  console.log("task 2")
  yield* _(Effect.addFinalizer(() => Console.log("finalizer after task 2")))
})

const program = Effect.gen(function* (_) {
  const scope1 = yield* _(Scope.make())
  const scope2 = yield* _(Scope.make())

  // Extend the scope of task1 into scope1
  yield* _(task1, Scope.extend(scope1))

  // Extend the scope of task2 into scope2
  yield* _(task2, Scope.extend(scope2))

  // Close scope1 and scope2 manually
  yield* _(Scope.close(scope1, Exit.unit))
  yield* _(Console.log("doing something else"))
  yield* _(Scope.close(scope2, Exit.unit))
})

Effect.runPromise(program.pipe(Effect.scoped))
/*
Output:
task 1
task 2
finalizer after task 1
doing something else
finalizer after task 2
*/
