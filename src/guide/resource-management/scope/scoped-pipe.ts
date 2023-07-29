import { Effect } from "effect"
import { resource } from "./resource"

// $ExpectType Effect<never, Error, void>
const program = Effect.scoped(
  resource.pipe(
    Effect.flatMap((res) =>
      Effect.sync(() => console.log(`content is ${res.contents}`))
    )
  )
)
