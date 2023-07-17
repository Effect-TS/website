import { Effect, Schedule } from "effect"
import { effect } from "./fake"

// Define a repetition policy using a fixed delay between retries
const policy = Schedule.fixed("100 millis")

const repeated = Effect.retry(effect, policy)

Effect.runPromise(repeated).then((s) => console.log(`result: ${s}`))
/*
failure
failure
failure
success
result: yay!
*/
