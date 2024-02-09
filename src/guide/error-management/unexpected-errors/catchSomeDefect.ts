import { Effect, Cause, Option, Console } from "effect"

// $ExpectType Effect<void, never, never>
const program = Effect.catchSomeDefect(
  Effect.dieMessage("Boom!"), // Simulating a runtime error
  (defect) => {
    if (Cause.isIllegalArgumentException(defect)) {
      return Option.some(
        Console.log(
          `Caught an IllegalArgumentException defect: ${defect.message}`
        )
      )
    }
    return Option.none()
  }
)

// Since we are only catching IllegalArgumentException
// we will get an Exit.Failure because we simulated a runtime error.
Effect.runPromiseExit(program).then(console.log)
/*
Output:
{
  _id: "Exit",
  _tag: "Failure",
  cause: {
    _id: "Cause",
    _tag: "Die",
    defect: {
      _tag: "RuntimeException",
      message: "Boom!",
      [Symbol(@effect/io/Cause/errors/RuntimeException)]: Symbol(@effect/io/Cause/errors/RuntimeException),
      toString: [Function: toString]
    }
  }
}
*/
