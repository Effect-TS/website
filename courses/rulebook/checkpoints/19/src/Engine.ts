import {
  Cause,
  Context,
  Duration,
  Effect,
  Exit,
  FiberMap,
  FileSystem,
  Layer,
  References,
  Schedule,
  Schema,
  Tracer
} from "effect"
import { HttpClient } from "effect/http"
import { ActionFailed, appendLine } from "./Action.ts"
import { poll } from "./Poll.ts"
import { evaluate, type Event, type MissingField, type Payload } from "./Rule.ts"
import { RuleStore, type StoredRule } from "./RuleStore.ts"
import { columns, RunLog, type RunResult } from "./RunLog.ts"

// What one execution of a rule returns to its caller. Failures and crashes
// are values here, so one bad rule does not stop the others. An interrupted
// run returns nothing: the interruption goes on to whoever interrupted it.
export const Outcome = Schema.Struct({
  ruleId: Schema.String,
  runId: Schema.String,
  outcome: Schema.Literals(["skipped", "succeeded", "failed", "crashed"]),
  reason: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String)
})
export type Outcome = typeof Outcome.Type

// An interval rule whose run crashed. A bug does not get to run again every
// few seconds: the loop ends, and the rule waits for the next server start.
export class RuleStopped extends Schema.TaggedError<RuleStopped>()("RuleStopped", {
  ruleId: Schema.String,
  error: Schema.String
}) {}

// The longest one run may take, the poll of an interval rule included.
const timeout = Duration.seconds(10)

type Finished = Exclude<RunResult, { readonly outcome: "interrupted" }>

const failed = (error: ActionFailed | Cause.TimeoutError): Finished =>
  error instanceof ActionFailed
    ? { outcome: "failed", reason: error.reason, error: error.message }
    : { outcome: "failed", reason: "timeout", error: `timed out after ${Duration.format(timeout)}` }

const crashed = (defect: unknown): Finished => ({
  outcome: "crashed",
  error: defect instanceof Error ? defect.message : String(defect)
})

// The terminal row of a run, read from how it ended.
const terminal = (exit: Exit.Exit<Finished, ActionFailed | Cause.TimeoutError>): RunResult => {
  if (Exit.isSuccess(exit)) return exit.value
  if (Cause.hasInterruptsOnly(exit.cause)) return { outcome: "interrupted" }
  const error = Cause.squash(exit.cause)
  return error instanceof ActionFailed || Cause.isTimeoutError(error) ? failed(error) : crashed(error)
}

export class Engine extends Context.Service<Engine, {
  readonly execute: (rule: StoredRule, event: Event) => Effect.Effect<Outcome>
  readonly handleEvent: (event: Event) => Effect.Effect<ReadonlyArray<Outcome>>
  // Starts polling for an interval rule; any other rule has nothing to start.
  readonly start: (rule: StoredRule) => Effect.Effect<void>
  // Interrupts the rule's loop and waits until it has stopped, its last row
  // written. Does nothing when the rule has no loop.
  readonly stop: (id: string) => Effect.Effect<void>
  readonly isRunning: (id: string) => Effect.Effect<boolean>
}>()("rulebook/Engine") {
  static readonly layer = Layer.effect(
    Engine,
    Effect.gen(function*() {
      const store = yield* RuleStore
      const runLog = yield* RunLog
      const fs = yield* FileSystem.FileSystem
      const client = yield* HttpClient.HttpClient

      // Gets the payload, evaluates the condition and runs the action, all
      // within the timeout. Its span ends with this result, so a failed poll
      // or action, a timeout and a crash all show as errors in the trace. A
      // missing field means the rule does not apply: a skip, not an error.
      const run = Effect.fn("Engine.execute")(
        function*(
          rule: StoredRule,
          payload: Effect.Effect<Payload, ActionFailed>
        ): Effect.fn.Return<Finished, ActionFailed | MissingField> {
          yield* Effect.annotateCurrentSpan({ "rule.id": rule.id, "rule.trigger": rule.trigger.type })
          const input = yield* payload
          const { condition } = rule
          if (condition !== undefined && !(yield* evaluate(rule, input))) {
            return {
              outcome: "skipped",
              reason: `condition ${condition.field} ${condition.op} ${condition.value} is false`
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
          (error) => Effect.succeed<Finished>({ outcome: "skipped", reason: `missing field ${error.field}` })
        ),
        Effect.timeout(timeout)
      )

      // Writes the terminal row. A crash is logged as the bug it is. When the
      // write itself fails, the row stays `started` and the failure is logged
      // with the run id; how the run ended is left as it was.
      const finish = (started: { readonly id: string }, exit: Exit.Exit<Finished, ActionFailed | Cause.TimeoutError>) =>
        Effect.gen(function*() {
          const result = terminal(exit)
          if (result.outcome === "crashed" && Exit.isFailure(exit)) {
            yield* Effect.logError("run crashed", exit.cause)
          }
          yield* runLog.finish(started.id, result).pipe(
            Effect.catchCause((cause) => Effect.logError("could not write the end of the run", cause))
          )
        }).pipe(Effect.annotateLogs({ "run.id": started.id }))

      // The execution boundary: open the row, run inside the span, write the
      // terminal row from the Exit, then turn a failure or a crash into an
      // Outcome. Interruption is not caught: it ends the caller too.
      const boundary = Effect.fnUntraced(function*(rule: StoredRule, payload: Effect.Effect<Payload, ActionFailed>) {
        const started = yield* runLog.start({ ruleId: rule.id, trigger: rule.trigger.type })
        const result = yield* run(rule, payload).pipe(
          Effect.onExit((exit) => finish(started, exit)),
          Effect.catch((error) => Effect.succeed(failed(error))),
          Effect.catchDefect((defect) => Effect.succeed(crashed(defect)))
        )
        return { ruleId: rule.id, runId: started.id, ...columns(result) }
      }, (effect, rule) => Effect.annotateLogs(effect, { "rule.id": rule.id }))

      // One execution of an interval rule: the poll is its payload.
      const interval = (rule: StoredRule, url: string) =>
        boundary(rule, poll(url).pipe(Effect.provideService(HttpClient.HttpClient, client)))

      // Runs one rule. An event rule runs against the given event. An interval
      // rule polls its URL, as its ticks do, and the event is not used.
      const execute = (rule: StoredRule, event: Event) =>
        rule.trigger.type === "interval" ? interval(rule, rule.trigger.url) : boundary(rule, Effect.succeed(event))

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

      // One fiber per interval rule, keyed by its id. The map belongs to this
      // layer's scope: when the server stops, every loop is interrupted, and
      // each writes its last row before the stores below close.
      const loops = yield* FiberMap.make<string>()

      // One tick is one execution, with the poll inside it. `failed` is an
      // answer like any other and the loop goes on; `crashed` stops it.
      const tick = (rule: StoredRule, url: string) =>
        interval(rule, url).pipe(
          Effect.flatMap((outcome) =>
            outcome.outcome === "crashed"
              ? Effect.fail(new RuleStopped({ ruleId: rule.id, error: outcome.error ?? "" }))
              : Effect.void
          )
        )

      const start = Effect.fnUntraced(function*(rule: StoredRule) {
        if (rule.trigger.type !== "interval") return
        // The first tick runs at once, the next ones `everySeconds` after the
        // previous one ended.
        const loop = tick(rule, rule.trigger.url).pipe(
          Effect.repeat(Schedule.spaced(Duration.seconds(rule.trigger.everySeconds))),
          Effect.catchTag("RuleStopped", (error) => Effect.logError("interval rule stopped", error.error)),
          Effect.onInterrupt(() => Effect.logInfo("interval rule interrupted")),
          Effect.annotateLogs({ "rule.id": rule.id }),
          // The loop outlives the request that added the rule: its ticks are
          // traces of their own, and its logs do not time that request.
          Effect.updateContext((context: Context.Context<never>) =>
            Context.omit(Tracer.ParentSpan, References.CurrentLogSpans)(context)
          )
        )
        yield* FiberMap.run(loops, rule.id, loop)
      })

      // Boot: rows left `started` by the previous process are abandoned, then
      // every stored interval rule starts polling again.
      yield* runLog.abandonStarted
      for (const rule of yield* store.list) {
        yield* start(rule)
      }

      return Engine.of({
        execute,
        handleEvent,
        start,
        stop: (id) => FiberMap.remove(loops, id),
        isRunning: (id) => FiberMap.has(loops, id)
      })
    })
  )
}
