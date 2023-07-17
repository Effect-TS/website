import { Effect } from "effect"

const foo = Effect.succeed(42)
const bar = Effect.succeed("Hello")

// $ExpectType Effect<never, never, [number, string]>
const combinedEffect = Effect.all([foo, bar])

console.log(Effect.runSync(combinedEffect)) // Output: [42, "Hello"]
