import { Effect, Option, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<never, never, void>
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

Effect.runSync(
  Effect.provideService(
    program,
    Random,
    Random.of({
      next: Effect.sync(() => Math.random())
    })
  )
)
// Output: 0.9957979486841035
