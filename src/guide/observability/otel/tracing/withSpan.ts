import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.unit.pipe(Effect.delay("100 millis"))

// $ExpectType Effect<never, never, void>
const instrumented = program.pipe(Effect.withSpan("myspan"))
