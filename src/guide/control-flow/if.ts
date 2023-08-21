import { Effect, Random, Console } from "effect"

// $ExpectType Effect<never, never, void>
const flipTheCoin = Effect.if(Random.nextBoolean, {
  onTrue: Console.log("Head"),
  onFalse: Console.log("Tail")
})

Effect.runSync(flipTheCoin)
