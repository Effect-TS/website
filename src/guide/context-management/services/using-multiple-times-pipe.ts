import { Effect } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Random.pipe(
  Effect.flatMap((random) =>
    random.next().pipe(
      Effect.flatMap((randomNumber) =>
        Effect.log(`random number: ${randomNumber}`)
      ),
      Effect.flatMap(() => random.next()),
      Effect.flatMap((randomNumber) =>
        Effect.log(`another random number: ${randomNumber}`)
      )
    )
  )
)

// $ExpectType Effect<never, never, void>
const runnable = Effect.provideService(
  program,
  Random,
  Random.of({
    next: () => Effect.succeed(Math.random()),
  })
)

Effect.runSync(runnable)
/*
..more infos... message="random number: 0.8241872233134417"
..more infos... message="another random number: 0.8241872233134417"
*/
