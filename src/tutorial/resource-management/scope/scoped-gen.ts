import { Effect } from "effect"
import { resource } from "./resource"

// Effect<Scope, Error, void>
const program = Effect.scoped(
  Effect.gen(function* (_) {
    const res = yield* _(resource)
    console.log(`content is ${res.contents}`)
  })
)
