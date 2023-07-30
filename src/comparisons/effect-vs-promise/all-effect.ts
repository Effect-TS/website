import { Effect } from "effect"

export const task1 = Effect.gen(function* (_) {
  console.log("Executing task1...")
  yield* _(Effect.sleep("100 millis"))
  console.log("task1 done")
  return 1
})

export const task2 = Effect.gen(function* (_) {
  console.log("Executing task2...")
  yield* _(Effect.sleep("200 millis"))
  console.log("task2 done")
  return yield* _(Effect.fail("Uh oh!"))
})

export const task3 = Effect.gen(function* (_) {
  console.log("Executing task3...")
  yield* _(Effect.sleep("300 millis"))
  console.log("task3 done")
  return 3
})

export const program = Effect.all([task1, task2, task3], {
  concurrency: "unbounded"
})

Effect.runPromise(program).then(console.log, console.error)
/*
Executing task1...
Executing task2...
Executing task3...
task1 done
task2 done
Error: Uh oh!
*/
