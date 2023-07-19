import { Effect } from "effect"

const task1 = Effect.succeed(1)
const task2 = Effect.fail("Oh uh!").pipe(Effect.as(2))
const task3 = Effect.succeed(3)
const task4 = Effect.fail("Oh no!").pipe(Effect.as(4))

// $ExpectType Effect<never, string, [[[number, number], number], number]>
const program = task1.pipe(
  Effect.zip(task2),
  Effect.zip(task3),
  Effect.zip(task4)
)

Effect.runPromise(program).then(console.log, console.error)
// Output: Error: Oh uh!
