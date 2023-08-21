import { Effect, Console } from "effect"
import { resource } from "./resource"

// $ExpectType Effect<never, Error, void>
const program = Effect.scoped(
  resource.pipe(
    Effect.flatMap((res) => Console.log(`content is ${res.contents}`))
  )
)
