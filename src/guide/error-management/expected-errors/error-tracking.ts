import { Effect, Random } from "effect"

class FooError {
  readonly _tag = "FooError"
}

class BarError {
  readonly _tag = "BarError"
}

const flakyFoo = Effect.flatMap(Random.next, (n1) =>
  n1 > 0.5 ? Effect.succeed("yay!") : Effect.fail(new FooError())
)

const flakyBar = Effect.flatMap(Random.next, (n2) =>
  n2 > 0.5 ? Effect.succeed("yay!") : Effect.fail(new BarError())
)

// $ExpectType Effect<never, FooError | BarError, string>
export const program = Effect.map(
  Effect.all([flakyFoo, flakyBar]),
  ([foo, bar]) => foo + bar
)
