import { Scope, Effect, Console, Exit } from "effect"

const program =
  // create a new scope
  Scope.make().pipe(
    // add finalizer 1
    Effect.tap((scope) =>
      Scope.addFinalizer(scope, Console.log("finalizer 1"))
    ),
    // add finalizer 2
    Effect.tap((scope) =>
      Scope.addFinalizer(scope, Console.log("finalizer 2"))
    ),
    // close the scope
    Effect.flatMap((scope) =>
      Scope.close(scope, Exit.succeed("scope closed successfully"))
    )
  )

Effect.runPromise(program)
/*
Output:
finalizer 2 <-- finalizers are closed in reverse order
finalizer 1
*/
