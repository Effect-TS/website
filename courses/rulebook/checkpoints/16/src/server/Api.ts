import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api/Api.ts"
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
      create: ({ payload }) => store.create(payload),
      list: () => store.list,
      get: ({ params }) => store.get(params.id),
      remove: ({ params }) => store.remove(params.id),
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
