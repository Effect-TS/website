import { Console, Effect, Exit, Scope } from "effect"

const task1 = Console.log("task 1").pipe(
  Effect.tap(() =>
    Effect.addFinalizer(() => Console.log("finalizer after task 1"))
  )
)

const task2 = Console.log("task 2").pipe(
  Effect.tap(() =>
    Effect.addFinalizer(() => Console.log("finalizer after task 2"))
  )
)

const program = Effect.all([Scope.make(), Scope.make()]).pipe(
  Effect.flatMap(([scope1, scope2]) =>
    Scope.extend(task1, scope1).pipe(
      Effect.flatMap(() => Scope.extend(task2, scope2)),
      Effect.flatMap(() => Scope.close(scope1, Exit.unit)),
      Effect.flatMap(() => Console.log("doing something else")),
      Effect.flatMap(() => Scope.close(scope2, Exit.unit))
    )
  )
)

Effect.runPromise(program.pipe(Effect.scoped))
/*
Output:
task 1
task 2
finalizer after task 1
doing something else
finalizer after task 2
*/
