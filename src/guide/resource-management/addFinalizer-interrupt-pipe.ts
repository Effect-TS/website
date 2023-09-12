import { Effect, Console } from "effect"

// $ExpectType Effect<Scope, never, never>
const program = Effect.addFinalizer((exit) =>
  Console.log(`finalizer after ${exit._tag}`)
).pipe(Effect.flatMap(() => Effect.interrupt))

// $ExpectType Effect<never, never, never>
const runnable = Effect.scoped(program)

Effect.runPromise(runnable).then(console.log, console.error)
/*
Output:
finalizer after Failure
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Interrupt",
    fiberId: {
      _id: "FiberId",
      _tag: "Runtime",
      id: 0,
      startTimeMillis: ...
    }
  }
}
*/
