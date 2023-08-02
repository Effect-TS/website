import { Effect } from "effect"

const record: Record<string, Effect.Effect<never, string, number>> = {
  key1: Effect.succeed(1).pipe(Effect.tap(Effect.log)),
  key2: Effect.succeed(2).pipe(Effect.tap(Effect.log)),
}

// $ExpectType Effect<never, string, { [x: string]: number; }>
const combinedEffect = Effect.all(record)

console.log(Effect.runSync(combinedEffect))
/*
... message=1
... message=2
{ key1: 1, key2: 2 }
*/
