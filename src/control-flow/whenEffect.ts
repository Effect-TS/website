import { Effect, Random } from "effect"

// $ExpectType Effect<Option<number>, never, never>
const randomIntOption = Random.nextInt.pipe(
  Effect.whenEffect(Random.nextBoolean)
)
