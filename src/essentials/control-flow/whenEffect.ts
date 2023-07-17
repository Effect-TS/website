import { Effect, Random } from "effect"

// $ExpectType Effect<never, never, Option<number>>
const randomIntOption = Effect.whenEffect(Random.nextBoolean)(Random.nextInt)
