import { Effect, SynchronizedRef } from "effect"

// Simulate API
const getAge = (userId: number) => Effect.succeed({ userId, age: userId * 10 })

const users = [1, 2, 3, 4]

const meanAge = Effect.gen(function* (_) {
  const ref = yield* _(SynchronizedRef.make(0))

  const log = <R, E, A>(label: string, effect: Effect.Effect<R, E, A>) =>
    Effect.gen(function* (_) {
      const value = yield* _(SynchronizedRef.get(ref))
      yield* _(Effect.log(`${label} get: ${value}`))
      return yield* _(effect)
    })

  const task = (id: number) =>
    log(
      `task ${id}`,
      SynchronizedRef.updateEffect(ref, (sumOfAges) =>
        Effect.gen(function* (_) {
          const user = yield* _(getAge(id))
          return sumOfAges + user.age
        })
      )
    )

  yield* _(
    task(1).pipe(
      Effect.zip(task(2), { concurrent: true }),
      Effect.zip(task(3), { concurrent: true }),
      Effect.zip(task(4), { concurrent: true })
    )
  )

  const value = yield* _(SynchronizedRef.get(ref))
  return value / users.length
})

Effect.runPromise(meanAge).then(console.log)
/*
Output:
... fiber=#1 message="task 4 get: 0"
... fiber=#2 message="task 3 get: 40"
... fiber=#3 message="task 1 get: 70"
... fiber=#4 message="task 2 get: 80"
25
*/
