import { Effect, Schedule } from "effect"

const action = Effect.sync(() => {
  console.log("success")
})

const policy = Schedule.recurs(2) // Repeat for a maximum of 2 times
  .pipe(Schedule.addDelay(() => "100 millis")) // Add a delay of 100 milliseconds between repetitions

const program = Effect.repeat(action, policy)

Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
/*
success
success
success
repetitions: 2
*/
