import { Effect, Option, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<void, never, never>
const program = Effect.serviceOption(Random).pipe(
  Effect.flatMap((maybeRandom) =>
    Option.match(maybeRandom, {
      // the service is not available, return a default value
      onNone: () => Effect.succeed(-1),
      // the service is available
      onSome: (random) => random.next
    })
  ),
  Effect.flatMap((randomNumber) => Console.log(`${randomNumber}`))
)

Effect.runPromise(
  Effect.provideService(program, Random, {
    next: Effect.sync(() => Math.random())
  })
).then(console.log)
// Output: 0.9957979486841035
