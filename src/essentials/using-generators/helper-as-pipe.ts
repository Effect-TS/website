import { Effect, Random } from "effect"

const program = Effect.gen(function* (_) {
  const n = yield* _(
    Random.next,
    Effect.map((n) => n * 2)
  )
  if (n > 0.5) {
    return yield* _(Effect.succeed("yay!"))
  } else {
    return yield* _(Effect.fail("oh no!"))
  }
})
