import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
export const mapped = Effect.succeed("Hello").pipe(Effect.map((s) => s.length))
