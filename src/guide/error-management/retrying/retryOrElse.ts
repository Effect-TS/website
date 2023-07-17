import { Effect, Schedule } from "effect"

let count = 0

// Define an async effect that simulates an action with possible failures
const action = Effect.async<never, Error, string>((resume) => {
  if (count <= 2) {
    count++
    console.log("failure")
    resume(Effect.fail(new Error()))
  } else {
    console.log("success")
    resume(Effect.succeed("yay!"))
  }
})

const policy = Schedule.recurs(2) // Retry for a maximum of 2 times
  .pipe(
    Schedule.addDelay(() => "100 millis") // Add a delay of 100 milliseconds between retries
  )

// Create a new effect that retries the action with the specified policy,
// and provides a fallback action if all retries fail
const repeated = Effect.retryOrElse(action, policy, () =>
  Effect.sync(() => {
    console.log("orElse")
    return "default value"
  })
)

Effect.runPromise(repeated).then((s) => console.log(`result: ${s}`))
/*
failure
failure
failure
orElse
result: default value
*/
