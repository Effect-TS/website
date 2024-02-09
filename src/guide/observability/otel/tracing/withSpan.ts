import { Effect } from "effect"

// $ExpectType Effect<void, never, never>
const program = Effect.unit.pipe(Effect.delay("100 millis"))

// $ExpectType Effect<void, never, never>
const instrumented = program.pipe(Effect.withSpan("myspan"))
