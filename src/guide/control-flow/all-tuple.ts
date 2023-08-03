import { Effect } from "effect"

const tuple = [
  Effect.succeed(42).pipe(Effect.tap(Effect.log)),
  Effect.succeed("Hello").pipe(Effect.tap(Effect.log))
] as const

// $ExpectType Effect<never, string, [number, string]>
const combinedEffect = Effect.all(tuple)

console.log(Effect.runSync(combinedEffect))
/*
... message=42
... message=Hello
[ 42, 'Hello' ]
*/
