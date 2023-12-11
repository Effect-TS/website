import { Effect, Console } from "effect"

// $ExpectType Effect<never, string, string>
const effect = Effect.fail("Oh uh!").pipe(Effect.as("primary result"))

// $ExpectType Effect<never, Cause<string>, string>
const sandboxed = Effect.sandbox(effect)

// $ExpectType Effect<never, Empty | Sequential<string> | Parallel<string>, string>
const program = Effect.catchTags(sandboxed, {
  Die: (cause) =>
    Console.log(`Caught a defect: ${cause.defect}`).pipe(
      Effect.as("fallback result on defect")
    ),
  Interrupt: (cause) =>
    Console.log(`Caught a defect: ${cause.fiberId}`).pipe(
      Effect.as("fallback result on fiber interruption")
    ),
  Fail: (cause) =>
    Console.log(`Caught a defect: ${cause.error}`).pipe(
      Effect.as("fallback result on failure")
    )
})

// $ExpectType Effect<never, string, string>
const main = Effect.unsandbox(program)

Effect.runPromise(main).then(console.log)
/*
Output:
Caught a defect: Oh uh!
fallback result on failure
*/
