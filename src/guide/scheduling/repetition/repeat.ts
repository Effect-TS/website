import { Effect, Schedule, Console } from "effect"

const action = Console.log("success")

const policy = Schedule.addDelay(
  Schedule.recurs(2), // Repeat for a maximum of 2 times
  () => "100 millis" // Add a delay of 100 milliseconds between repetitions
)

const program = Effect.repeat(action, policy)

Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
/*
success
success
success
repetitions: 2
*/
