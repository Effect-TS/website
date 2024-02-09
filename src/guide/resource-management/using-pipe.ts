import { Effect, Console } from "effect"
import { resource } from "./resource"

// $ExpectType Effect<void, Error, Scope>
const program = resource.pipe(
  Effect.flatMap((res) => Console.log(`content is ${res.contents}`))
)
