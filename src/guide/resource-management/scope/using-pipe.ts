import { Effect } from "effect"
import { resource } from "./resource"

// $ExpectType Effect<Scope, Error, void>
const program = Effect.flatMap(resource, (res) =>
  Effect.sync(() => console.log(`content is ${res.contents}`))
)
