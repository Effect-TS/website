import { Effect } from "effect"
import { Random } from "./service"

// Effect<Random, never, void>
const program = Random.pipe(
  Effect.flatMap((random) => random.next()),
  Effect.flatMap((randomNumber) => Effect.log(`${randomNumber}`))
)

// Effect<never, never, void>
const runnable = Effect.provideService(
  program,
  Random,
  Random.of({
    next: () => Effect.succeed(Math.random()),
  })
)

Effect.runSync(runnable)
// Output: ...more infos... message=0.8241872233134417
