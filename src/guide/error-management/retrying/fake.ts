import { Effect } from "effect"

let count = 0

// Simulates an effect with possible failures
export const effect = Effect.async<never, Error, string>((resume) => {
  if (count <= 2) {
    count++
    console.log("failure")
    resume(Effect.fail(new Error()))
  } else {
    console.log("success")
    resume(Effect.succeed("yay!"))
  }
})
