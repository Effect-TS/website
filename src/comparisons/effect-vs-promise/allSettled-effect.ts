import { Effect } from "effect"

const task1 = Effect.gen(function* (_) {
  console.log("Executing task1...")
  yield* _(Effect.sleep("100 millis"))
  console.log("task1 done")
  return 1
})

const task2 = Effect.gen(function* (_) {
  console.log("Executing task2...")
  yield* _(Effect.sleep("200 millis"))
  console.log("task2 done")
  return yield* _(Effect.fail("Uh oh!"))
})

const task3 = Effect.gen(function* (_) {
  console.log("Executing task3...")
  yield* _(Effect.sleep("300 millis"))
  console.log("task3 done")
  return 3
})

export const program = Effect.forEach(
  [task1, task2, task3],
  (task) => Effect.either(task), // or Effect.exit
  {
    concurrency: "unbounded"
  }
)

Effect.runPromise(program).then(console.log, console.error)
/*
Executing task1...
Executing task2...
Executing task3...
task1 done
task2 done
task3 done
[
  { _tag: 'Right', right: 1 },
  { _tag: 'Left', left: 'Uh oh!' },
  { _tag: 'Right', right: 3 }
]
*/
