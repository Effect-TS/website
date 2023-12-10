import { Effect, Random } from "effect"

// $ExpectType Effect<never, never, Option<number>>
const randomIntOption = Random.nextInt.pipe(
  Effect.whenEffect(Random.nextBoolean)
)
