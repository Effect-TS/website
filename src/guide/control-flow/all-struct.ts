import { Effect } from "effect"

const struct = {
  a: Effect.succeed(42).pipe(Effect.tap(Effect.log)),
  b: Effect.succeed("Hello").pipe(Effect.tap(Effect.log))
}

// $ExpectType Effect<never, string, { a: number; b: string; }>
const combinedEffect = Effect.all(struct)

console.log(Effect.runSync(combinedEffect))
/*
... message=42
... message=Hello
{ a: 42, b: 'Hello' }
*/
