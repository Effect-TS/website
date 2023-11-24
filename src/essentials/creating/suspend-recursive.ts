import { Effect } from "effect"

const blowsUp = (n: number): Effect.Effect<never, never, number> =>
  n < 2
    ? Effect.succeed(1)
    : Effect.zipWith(blowsUp(n - 1), blowsUp(n - 2), (a, b) => a + b)

// console.log(Effect.runSync(blowsUp(32))) // crash: JavaScript heap out of memory

const allGood = (n: number): Effect.Effect<never, never, number> =>
  n < 2
    ? Effect.succeed(1)
    : Effect.zipWith(
        Effect.suspend(() => allGood(n - 1)),
        Effect.suspend(() => allGood(n - 2)),
        (a, b) => a + b
      )

console.log(Effect.runSync(allGood(32))) // Output: 3524578
