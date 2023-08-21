import { Effect, Console } from "effect"

const tuple = [
  Effect.succeed(42).pipe(Effect.tap(Console.log)),
  Effect.succeed("Hello").pipe(Effect.tap(Console.log))
] as const

// $ExpectType Effect<never, never, [number, string]>
const combinedEffect = Effect.all(tuple)

console.log(Effect.runSync(combinedEffect))
/*
Output:
42
Hello
[ 42, 'Hello' ]
*/
