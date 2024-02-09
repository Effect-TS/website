import { Effect } from "effect"
import * as Counter from "./Counter"

// $ExpectType Effect<void, never, never>
const program = Effect.gen(function* (_) {
  const counter = yield* _(Counter.make)
  yield* _(counter.inc)
  yield* _(counter.inc)
  yield* _(counter.dec)
  yield* _(counter.inc)
  const value = yield* _(counter.get)
  console.log(`This counter has a value of ${value}.`)
})

Effect.runPromise(program)
/*
Output:
This counter has a value of 2.
*/
