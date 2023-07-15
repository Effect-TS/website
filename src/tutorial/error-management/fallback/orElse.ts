import { Effect } from "effect"

const success = Effect.succeed("success")
const failure = Effect.fail("failure")
const fallback = Effect.succeed("fallback")

const program1 = success.pipe(Effect.orElse(() => fallback))
console.log(Effect.runSync(program1)) // Output: "success"

const program2 = failure.pipe(Effect.orElse(() => fallback))
console.log(Effect.runSync(program2)) // Output: "fallback"
