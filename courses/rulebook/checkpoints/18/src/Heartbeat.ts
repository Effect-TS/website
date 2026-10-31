import { Effect, Layer, Schedule } from "effect"
import { RuleStore } from "./RuleStore.ts"

// Logs how many rules are stored, now and then every 30 seconds, for as long
// as the server runs. The loop is forked into the layer's scope: when the
// server stops, the scope closes, the loop is interrupted and says so.
export const layer = Layer.effectDiscard(Effect.gen(function*() {
  const store = yield* RuleStore
  yield* Effect.gen(function*() {
    const rules = yield* store.list
    yield* Effect.logInfo(`rules stored: ${rules.length}`)
  }).pipe(
    Effect.repeat(Schedule.spaced("30 seconds")),
    Effect.onInterrupt(() => Effect.logInfo("heartbeat stopped")),
    Effect.forkScoped
  )
}))
