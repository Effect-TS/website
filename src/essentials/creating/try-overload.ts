import { Effect } from "effect"

// $ExpectType Effect<any, Error, never>
const program = Effect.try({
  try: () => JSON.parse(""), // JSON.parse may throw for bad input
  catch: (unknown) => new Error(`something went wrong ${unknown}`) // remap the error
})
