import { Effect, Context } from "effect"

export interface Random {
  readonly next: Effect.Effect<never, never, number>
}

export const Random = Context.Tag<Random>()
