import { Effect, Random } from "effect"

// $ExpectType Effect<never, never, void>
const flipTheCoin = Effect.if(Random.nextBoolean, {
  onTrue: Effect.log("Head"),
  onFalse: Effect.log("Tail")
})

Effect.runSync(flipTheCoin)
/*
... level=INFO fiber=#0 message=Head (or Tail)
*/
