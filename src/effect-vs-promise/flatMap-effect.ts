import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
export const flatMapped = Effect.succeed("Hello").pipe(
  Effect.flatMap((s) => Effect.succeed(s.length))
)
