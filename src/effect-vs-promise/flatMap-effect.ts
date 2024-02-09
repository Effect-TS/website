import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
export const flatMapped = Effect.succeed("Hello").pipe(
  Effect.flatMap((s) => Effect.succeed(s.length))
)
