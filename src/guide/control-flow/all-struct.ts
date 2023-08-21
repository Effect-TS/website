import { Effect, Console } from "effect"

const struct = {
  a: Effect.succeed(42).pipe(Effect.tap(Console.log)),
  b: Effect.succeed("Hello").pipe(Effect.tap(Console.log))
}

// $ExpectType Effect<never, never, { a: number; b: string; }>
const combinedEffect = Effect.all(struct)

console.log(Effect.runSync(combinedEffect))
/*
Output:
42
Hello
{ a: 42, b: 'Hello' }
*/
