import { Effect, Option } from "effect"

// $ExpectType Effect<never, string, Option<number>>
const simulatedTask = Effect.fail("Oh uh!").pipe(Effect.as(Option.some(2)))

// $ExpectType Effect<never, Option<string>, number>
const some = Effect.some(simulatedTask)

// $ExpectType Effect<never, string, Option<number>>
const unsome = Effect.unsome(some)
