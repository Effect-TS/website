import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
export const mapped = Effect.succeed("Hello").pipe(Effect.map((s) => s.length))
