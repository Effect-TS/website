import { Effect, Context } from "effect"

interface Random {
  readonly next: () => Effect.Effect<never, never, number>
}

const Random = Context.Tag<Random>()

declare const program: Effect.Effect<Random, string, number>

// type R = Random
type R = Effect.Effect.Context<typeof program>

// type E = string
type E = Effect.Effect.Error<typeof program>

// type A = number
type A = Effect.Effect.Success<typeof program>
