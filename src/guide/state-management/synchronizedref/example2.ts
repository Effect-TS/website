import { Effect, SynchronizedRef } from "effect"

// Simulate API
const getAge = (userId: number) => Effect.succeed({ userId, age: userId * 10 })

const users = [1, 2, 3, 4]

const meanAge = Effect.gen(function* (_) {
  const ref = yield* _(SynchronizedRef.make(0))
  yield* _(
    Effect.forEach(users, (userId) =>
      SynchronizedRef.updateEffect(ref, (sumOfAges) =>
        getAge(userId).pipe(Effect.map((user) => sumOfAges + user.age))
      )
    )
  )
  const value = yield* _(SynchronizedRef.get(ref))
  return value / users.length
})

Effect.runPromise(meanAge).then(console.log)
/*
Output:
25
*/
