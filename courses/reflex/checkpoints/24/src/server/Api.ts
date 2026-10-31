import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api, type ListedRule } from "../api/Api.ts"
import { Engine } from "../Engine.ts"
import { Limits, PayloadTooLarge, TooManyRules } from "../Limits.ts"
import type { Event } from "../Rule.ts"
import { RuleStore } from "../RuleStore.ts"
import { RunLog } from "../RunLog.ts"

// One handler per endpoint, each a thin call into the services from lessons 12
// and 13. A handler can fail only with the errors its endpoint declares, so
// the compiler checks that RuleNotFound is the one error that crosses the wire.

// An event's size is the UTF-8 length of its JSON. One that is too large is
// refused before any rule sees it, whether it is submitted or run by hand.
const checkSize = Effect.fn(function*(event: Event, max: number) {
  const bytes = new TextEncoder().encode(JSON.stringify(event)).length
  if (bytes > max) {
    return yield* new PayloadTooLarge({ bytes, max })
  }
})

const RulesHandlers = HttpApiBuilder.group(
  Api,
  "rules",
  Effect.fn(function*(handlers) {
    const store = yield* RuleStore
    const engine = yield* Engine
    const { maxPayloadBytes, maxRules } = yield* Limits
    return handlers.handleAll({
      // An interval rule starts polling as soon as it is stored.
      create: Effect.fn(function*({ payload }) {
        if ((yield* store.list).length >= maxRules) {
          return yield* new TooManyRules({ max: maxRules })
        }
        const rule = yield* store.create(payload)
        yield* engine.start(rule)
        return rule
      }),
      // The FiberMap knows whether a rule's loop still runs; nothing about it
      // is stored.
      list: Effect.fn(function*() {
        const rules: Array<ListedRule> = []
        for (const rule of yield* store.list) {
          if (engine.isPaused(rule.id)) {
            rules.push({ ...rule, status: "paused" })
          } else if (rule.trigger.type === "interval") {
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
      // Both look the rule up first, so an unknown id is a RuleNotFound.
      pause: Effect.fn(function*({ params }) {
        yield* store.get(params.id)
        yield* engine.pause(params.id)
      }),
      resume: Effect.fn(function*({ params }) {
        yield* engine.resume(yield* store.get(params.id))
      }),
      run: Effect.fn(function*({ params, payload }) {
        yield* checkSize(payload, maxPayloadBytes)
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
    const { maxPayloadBytes } = yield* Limits
    return handlers.handleAll({
      submit: Effect.fn(function*({ payload }) {
        yield* checkSize(payload, maxPayloadBytes)
        return yield* engine.handleEvent(payload)
      })
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
