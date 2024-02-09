import { Effect, Random, Console } from "effect"

// $ExpectType Effect<void, never, never>
const flipTheCoin = Effect.if(Random.nextBoolean, {
  onTrue: Console.log("Head"),
  onFalse: Console.log("Tail")
})

Effect.runPromise(flipTheCoin)
