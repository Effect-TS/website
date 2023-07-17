import { Effect, Random } from "effect"

class FooError {
  readonly _tag = "FooError"
}

class BarError {
  readonly _tag = "BarError"
}

const flakyFoo = Random.next.pipe(
  Effect.flatMap((n1) =>
    n1 > 0.5 ? Effect.succeed("yay!") : Effect.fail(new FooError())
  )
)

const flakyBar = Random.next.pipe(
  Effect.flatMap((n2) =>
    n2 > 0.5 ? Effect.succeed("yay!") : Effect.fail(new BarError())
  )
)

// $ExpectType Effect<never, FooError | BarError, string>
export const program = Effect.all([flakyFoo, flakyBar]).pipe(
  Effect.map(([foo, bar]) => foo + bar)
)
