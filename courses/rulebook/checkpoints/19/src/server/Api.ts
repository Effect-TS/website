import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api, type ListedRule } from "../api/Api.ts"
import { Engine } from "../Engine.ts"
import { RuleStore } from "../RuleStore.ts"
import { RunLog } from "../RunLog.ts"

// One handler per endpoint, each a thin call into the services from lessons 12
// and 13. A handler can fail only with the errors its endpoint declares, so
// the compiler checks that RuleNotFound is the one error that crosses the wire.

const RulesHandlers = HttpApiBuilder.group(
  Api,
  "rules",
  Effect.fn(function*(handlers) {
    const store = yield* RuleStore
    const engine = yield* Engine
    return handlers.handleAll({
      // An interval rule starts polling as soon as it is stored.
      create: Effect.fn(function*({ payload }) {
        const rule = yield* store.create(payload)
        yield* engine.start(rule)
        return rule
      }),
      // The FiberMap knows whether a rule's loop still runs; nothing about it
      // is stored.
      list: Effect.fn(function*() {
        const rules: Array<ListedRule> = []
        for (const rule of yield* store.list) {
          if (rule.trigger.type === "interval") {
            const running = yield* engine.isRunning(rule.id)
            rules.push({ ...rule, status: running ? "running" : "stopped" })
          } else {
            rules.push(rule)
          }
        }
        return rules
      }),
      get: ({ params }) => store.get(params.id),
      // Stop the loop and wait for it, then delete, then answer: when the CLI
      // prints the confirmation, nothing runs for this rule any more.
      remove: Effect.fn(function*({ params }) {
        yield* engine.stop(params.id)
        yield* store.remove(params.id)
      }),
      run: Effect.fn(function*({ params, payload }) {
        const rule = yield* store.get(params.id)
        return yield* engine.execute(rule, payload)
      })
    })
  })
)

const EventsHandlers = HttpApiBuilder.group(
  Api,
  "events",
  Effect.fn(function*(handlers) {
    const engine = yield* Engine
    return handlers.handleAll({
      submit: ({ payload }) => engine.handleEvent(payload)
    })
  })
)

const RunsHandlers = HttpApiBuilder.group(
  Api,
  "runs",
  Effect.fn(function*(handlers) {
    const runLog = yield* RunLog
    return handlers.handleAll({
      list: ({ query }) => runLog.list(query)
    })
  })
)

export const layer = Layer.mergeAll(RulesHandlers, EventsHandlers, RunsHandlers)
