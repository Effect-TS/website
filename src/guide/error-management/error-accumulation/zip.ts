import { Effect } from "effect"

const task1 = Effect.succeed(1)
const task2 = Effect.fail("Oh uh!").pipe(Effect.as(2))
const task3 = Effect.succeed(3)
const task4 = Effect.fail("Oh no!").pipe(Effect.as(4))

// $ExpectType Effect<[[[number, number], number], number], string, never>
const program = task1.pipe(
  Effect.zip(task2),
  Effect.zip(task3),
  Effect.zip(task4)
)

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: "Oh uh!"
  }
}
*/
