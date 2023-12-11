import { Effect, Console } from "effect"

// $ExpectType Effect<Scope, string, never>
const program = Effect.gen(function* (_) {
  yield* _(
    Effect.addFinalizer((exit) => Console.log(`finalizer after ${exit._tag}`))
  )
  return yield* _(Effect.fail("Uh oh!"))
})

// $ExpectType Effect<never, string, never>
const runnable = Effect.scoped(program)

Effect.runPromise(runnable).then(console.log, console.error)
/*
Output:
finalizer after Failure
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: "Uh oh!"
  }
}*/
