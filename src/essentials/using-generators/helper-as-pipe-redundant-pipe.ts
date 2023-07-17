import { Effect, Random, pipe } from "effect"

const program = Effect.gen(function* (_) {
  const n = yield* _(
    pipe(
      Random.next,
      Effect.map((n) => n * 2)
    )
  )
  // ...
})
