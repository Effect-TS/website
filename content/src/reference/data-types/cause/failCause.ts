import { Effect, Cause } from "effect"

// Create an effect that intentionally fails with an empty cause
const effect: Effect.Effect<never, never, never> = Effect.failCause(Cause.empty)
