import { Effect, Context } from "effect"

class Random extends Context.Tag("Random")<
  Random,
  {
    readonly next: () => Effect.Effect<number>
  }
>() {}

declare const program: Effect.Effect<number, string, Random>

// type R = Random
type R = Effect.Effect.Context<typeof program>

// type E = string
type E = Effect.Effect.Error<typeof program>

// type A = number
type A = Effect.Effect.Success<typeof program>
