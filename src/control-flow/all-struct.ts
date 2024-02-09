import { Effect, Console } from "effect"

const struct = {
  a: Effect.succeed(42).pipe(Effect.tap(Console.log)),
  b: Effect.succeed("Hello").pipe(Effect.tap(Console.log))
}

// $ExpectType Effect<{ a: number; b: string; }, never, never>
const combinedEffect = Effect.all(struct)

Effect.runPromise(combinedEffect).then(console.log)
/*
Output:
42
Hello
{ a: 42, b: 'Hello' }
*/
