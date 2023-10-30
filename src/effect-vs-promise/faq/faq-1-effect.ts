import { Effect, Fiber } from "effect"

const task = (delay: number, name: string) =>
  Effect.gen(function* (_) {
    yield* _(Effect.sleep(delay))
    console.log(`${name} done`)
    return name
  })

const program = Effect.gen(function* (_) {
  const r0 = yield* _(Effect.fork(task(2_000, "long running task")))
  const r1 = yield* _(task(200, "task 2"))
  const r2 = yield* _(task(100, "task 3"))
  return {
    r1,
    r2,
    r0: yield* _(Fiber.join(r0))
  }
})

Effect.runPromise(program).then(console.log)
/*
Output:
task 2 done
task 3 done
long running task done
{ r1: 'task 2', r2: 'task 3', r0: 'long running promise' }
*/
