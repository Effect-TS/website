import { Effect } from "effect"

// Effect<never, Error, any>
const program = Effect.try({
  try: () => JSON.parse(""), // JSON.parse may throw for bad input
  catch: (unknown) => new Error(`something went wrong ${unknown}`), // remap the error
})
