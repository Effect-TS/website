import { Cause, Context, Effect, Exit, FileSystem, Layer, Schema } from "effect"
import { ActionFailed, appendLine } from "./Action.ts"
import { evaluate, type Event, type MissingField } from "./Rule.ts"
import { RuleStore, type StoredRule } from "./RuleStore.ts"
import { columns, RunLog, type RunResult } from "./RunLog.ts"

// What one execution of a rule returns to its caller. Failures are values
// here, so one failed rule does not stop the others.
export const Outcome = Schema.Struct({
  ruleId: Schema.String,
  runId: Schema.String,
  outcome: Schema.Literals(["skipped", "succeeded", "failed"]),
  reason: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String)
})
export type Outcome = typeof Outcome.Type

const failed = (error: ActionFailed): RunResult => ({ outcome: "failed", reason: error.reason, error: error.message })

export class Engine extends Context.Service<Engine, {
  readonly execute: (rule: StoredRule, event: Event) => Effect.Effect<Outcome>
  readonly handleEvent: (event: Event) => Effect.Effect<ReadonlyArray<Outcome>>
}>()("rulebook/Engine") {
  static readonly layer = Layer.effect(
    Engine,
    Effect.gen(function*() {
      const store = yield* RuleStore
      const runLog = yield* RunLog
      const fs = yield* FileSystem.FileSystem

      // Evaluates the condition and runs the action. Its span ends with this
      // result, so a failed action shows as an error in the trace. A missing
      // field means the rule does not apply: a skip, not an error.
      const run = Effect.fn("Engine.execute")(
        function*(rule: StoredRule, event: Event): Effect.fn.Return<RunResult, ActionFailed | MissingField> {
          yield* Effect.annotateCurrentSpan({ "rule.id": rule.id, "rule.trigger": rule.trigger.type })
          const { condition } = rule
          if (condition !== undefined) {
            const matched = yield* evaluate(rule, event)
            yield* Effect.annotateCurrentSpan("rule.condition", matched)
            if (!matched) {
              return {
                outcome: "skipped",
                reason: `condition ${condition.field} ${condition.op} ${condition.value} is false`
              }
            }
          }
          switch (rule.action.type) {
            case "appendFile":
              yield* appendLine(rule.action.path, rule.action.message).pipe(
                Effect.provideService(FileSystem.FileSystem, fs)
              )
              return { outcome: "succeeded" }
            case "httpPost":
              // Lesson 20 sends it. Until then the action does not run.
              return { outcome: "skipped", reason: "httpPost actions run from lesson 20" }
          }
        },
        Effect.catchTag(
          "MissingField",
          (error) => Effect.succeed<RunResult>({ outcome: "skipped", reason: `missing field ${error.field}` })
        )
      )

      // The execution boundary: open the row, run inside the span, write the
      // terminal row from the Exit, then turn a failure into an Outcome.
      const execute = Effect.fnUntraced(function*(rule: StoredRule, event: Event) {
        const started = yield* runLog.start({ ruleId: rule.id, trigger: rule.trigger.type })
        const result = yield* run(rule, event).pipe(
          Effect.onExit((exit) => {
            if (Exit.isSuccess(exit)) return runLog.finish(started.id, exit.value)
            const error = Cause.squash(exit.cause)
            return error instanceof ActionFailed ? runLog.finish(started.id, failed(error)) : Effect.void
          }),
          Effect.catchTag("ActionFailed", (error) => Effect.succeed(failed(error)))
        )
        return { ruleId: rule.id, runId: started.id, ...columns(result) }
      })

      // Runs every rule whose trigger is this event, one after another.
      const handleEvent = Effect.fn("Engine.handleEvent")(function*(event: Event) {
        const outcomes: Array<Outcome> = []
        for (const rule of yield* store.list) {
          if (rule.trigger.type === "event" && rule.trigger.event === event.type) {
            outcomes.push(yield* execute(rule, event))
          }
        }
        return outcomes
      })

      return Engine.of({ execute, handleEvent })
    })
  )
}
