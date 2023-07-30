import { Effect } from "effect"

export const task1 = Effect.gen(function* (_) {
  console.log("Executing task1...")
  yield* _(Effect.sleep("100 millis"))
  console.log("task1 done")
  return yield* _(Effect.fail("Something went wrong!"))
})

export const task2 = Effect.gen(function* (_) {
  console.log("Executing task2...")
  yield* _(Effect.sleep("200 millis"))
  console.log("task2 done")
  return 2
})

export const task3 = Effect.gen(function* (_) {
  console.log("Executing task3...")
  yield* _(Effect.sleep("300 millis"))
  console.log("task3 done")
  return yield* _(Effect.fail("Uh oh!"))
})

export const program = Effect.raceAll([task1, task2, task3])

Effect.runPromise(program).then(console.log, console.error)
/*
Executing task1...
Executing task2...
Executing task3...
task1 done
task2 done
2
*/
