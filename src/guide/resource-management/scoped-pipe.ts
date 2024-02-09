import { Effect, Console } from "effect"
import { resource } from "./resource"

// $ExpectType Effect<void, Error, never>
const program = Effect.scoped(
  resource.pipe(
    Effect.flatMap((res) => Console.log(`content is ${res.contents}`))
  )
)
