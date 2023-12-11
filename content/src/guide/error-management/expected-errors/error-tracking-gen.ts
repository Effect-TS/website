import { Effect, Random } from "effect"

class FooError {
  readonly _tag = "FooError"
}

class BarError {
  readonly _tag = "BarError"
}

// $ExpectType Effect<never, FooError | BarError, string>
export const program = Effect.gen(function* (_) {
  const n1 = yield* _(Random.next)
  const n2 = yield* _(Random.next)

  const foo = n1 > 0.5 ? "yay!" : yield* _(Effect.fail(new FooError()))

  const bar = n2 > 0.5 ? "yay!" : yield* _(Effect.fail(new BarError()))

  return foo + bar
})

Effect.runPromise(program).then(console.log, console.error)
