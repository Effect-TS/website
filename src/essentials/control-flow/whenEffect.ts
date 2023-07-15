import { Effect, Random } from "effect"

// Effect<never, never, Option.Option<number>>
const randomIntOption = Effect.whenEffect(Random.nextBoolean)(Random.nextInt)
