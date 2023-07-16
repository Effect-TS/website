import { Effect, Random } from "effect"

const onTrue = Effect.log("Head")
const onFalse = Effect.log("Tail")

// $ExpectType Effect<never, never, void>
const flipTheCoin = Effect.if(Random.nextBoolean, { onTrue, onFalse })

Effect.runSync(flipTheCoin)
/*
... level=INFO fiber=#0 message=Head (or Tail)
*/
