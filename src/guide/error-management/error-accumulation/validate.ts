import { Effect } from "effect"

const task1 = Effect.succeed(1)
const task2 = Effect.fail("Oh uh!").pipe(Effect.as(2))
const task3 = Effect.succeed(3)
const task4 = Effect.fail("Oh no!").pipe(Effect.as(4))

const program = task1.pipe(
  Effect.validate(task2),
  Effect.validate(task3),
  Effect.validate(task4)
)

Effect.runPromise(program).then(console.log, console.error)
/*
Error: Oh uh!
Error: Oh no!
*/
