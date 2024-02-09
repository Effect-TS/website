import { Effect } from "effect"

const foo = Effect.succeed(42)
const bar = Effect.succeed("Hello")

// $ExpectType Effect<[number, string], never, never>
const combinedEffect = Effect.all([foo, bar])

Effect.runPromise(combinedEffect).then(console.log) // Output: [42, "Hello"]
