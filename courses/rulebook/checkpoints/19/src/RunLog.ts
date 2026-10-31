import { Context, DateTime, Effect, Layer, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"

export const Trigger = Schema.Literals(["event", "interval"])

// How a finished run ended. `failed` names one of a fixed set of reasons,
// `skipped` says why in plain words, `crashed` is a bug and keeps its message.
export const RunResult = Schema.Union([
  Schema.Struct({ outcome: Schema.Literal("skipped"), reason: Schema.String }),
  Schema.Struct({ outcome: Schema.Literal("succeeded") }),
  Schema.Struct({
    outcome: Schema.Literal("failed"),
    reason: Schema.Literals(["status", "timeout", "io"]),
    error: Schema.String
  }),
  Schema.Struct({ outcome: Schema.Literal("crashed"), error: Schema.String }),
  Schema.Struct({ outcome: Schema.Literal("interrupted") })
])
export type RunResult = typeof RunResult.Type

// One row of the run history, as the runs table in migrations/ stores it.
export const Run = Schema.Struct({
  id: Schema.String,
  ruleId: Schema.String,
  trigger: Trigger,
  startedAt: Schema.DateTimeUtc,
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  outcome: Schema.Literals(["started", "skipped", "succeeded", "failed", "crashed", "interrupted", "abandoned"]),
  reason: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String)
})
export type Run = typeof Run.Type

// The reason and error columns for a result, null when it has none.
export const columns = <R extends RunResult>(result: R): {
  readonly outcome: R["outcome"]
  readonly reason: string | null
  readonly error: string | null
} => ({
  outcome: result.outcome,
  reason: "reason" in result ? result.reason : null,
  error: "error" in result ? result.error : null
})

export interface RunStart {
  readonly ruleId: string
  readonly trigger: typeof Trigger.Type
}

export interface ListOptions {
  readonly ruleId?: string | undefined
  readonly limit?: number | undefined
}

export class RunLog extends Context.Service<RunLog, {
  readonly start: (run: RunStart) => Effect.Effect<Run>
  readonly finish: (id: string, result: RunResult) => Effect.Effect<void>
  readonly list: (options?: ListOptions) => Effect.Effect<ReadonlyArray<Run>>
  // Marks every run still `started` as `abandoned`. Run once at boot, when no
  // run of this process has started yet: those rows belong to a process that
  // ended without writing them.
  readonly abandonStarted: Effect.Effect<void>
}>()("rulebook/RunLog") {
  // Runs in a Map, in the order they started.
  static readonly layerMemory = Layer.effect(
    RunLog,
    Effect.gen(function*() {
      const runs = new Map<string, Run>()

      const start = Effect.fn("RunLog.start")(function*(run: RunStart) {
        const row: Run = {
          id: crypto.randomUUID(),
          ruleId: run.ruleId,
          trigger: run.trigger,
          startedAt: yield* DateTime.now,
          finishedAt: null,
          outcome: "started",
          reason: null,
          error: null
        }
        runs.set(row.id, row)
        return row
      })

      const finish = Effect.fn("RunLog.finish")(function*(id: string, result: RunResult) {
        const row = runs.get(id)
        if (row === undefined) return
        runs.set(id, { ...row, ...columns(result), finishedAt: yield* DateTime.now })
      })

      // Newest first, optionally for one rule, at most `limit` rows.
      const list = Effect.fn("RunLog.list")(function*(options?: ListOptions) {
        const rows = Array.from(runs.values()).reverse()
          .filter((run) => options?.ruleId === undefined || run.ruleId === options.ruleId)
        return rows.slice(0, options?.limit ?? rows.length)
      })

      const abandonStarted = Effect.gen(function*() {
        const finishedAt = yield* DateTime.now
        for (const row of runs.values()) {
          if (row.outcome === "started") runs.set(row.id, { ...row, outcome: "abandoned", finishedAt })
        }
      })

      return RunLog.of({ start, finish, list, abandonStarted })
    })
  )

  // Runs in the `runs` table, which migrations/ creates. Times are stored as
  // ISO 8601 text, so ordering by started_at is ordering by time.
  static readonly layerSql = Layer.effect(
    RunLog,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      // A row as SQLite returns it: the times are text until decoded.
      const Row = Schema.Struct({
        ...Run.fields,
        startedAt: Schema.DateTimeUtcFromString,
        finishedAt: Schema.NullOr(Schema.DateTimeUtcFromString)
      })

      const insert = SqlSchema.void({
        Request: Row,
        execute: (row) =>
          sql`INSERT INTO runs ${
            sql.insert({
              id: row.id,
              rule_id: row.ruleId,
              trigger: row.trigger,
              started_at: row.startedAt,
              finished_at: row.finishedAt,
              outcome: row.outcome,
              reason: row.reason,
              error: row.error
            })
          }`
      })

      // Newest first, optionally for one rule, at most `limit` rows. SQLite
      // does the filtering, through the (rule_id, started_at) index, and a
      // limit of -1 means none.
      const findAll = SqlSchema.findAll({
        Request: Schema.Struct({ ruleId: Schema.optional(Schema.String), limit: Schema.optional(Schema.Number) }),
        Result: Row,
        execute: ({ ruleId, limit }) =>
          sql`SELECT id, rule_id AS ruleId, trigger, started_at AS startedAt, finished_at AS finishedAt,
            outcome, reason, error
            FROM runs
            WHERE ${sql.and(ruleId === undefined ? [] : [sql`rule_id = ${ruleId}`])}
            ORDER BY started_at DESC, rowid DESC
            LIMIT ${limit ?? -1}`
      })

      const start = Effect.fn("RunLog.start")(function*(run: RunStart) {
        const row: Run = {
          id: crypto.randomUUID(),
          ruleId: run.ruleId,
          trigger: run.trigger,
          startedAt: yield* DateTime.now,
          finishedAt: null,
          outcome: "started",
          reason: null,
          error: null
        }
        yield* insert(row)
        return row
      }, Effect.orDie)

      const finish = Effect.fn("RunLog.finish")(function*(id: string, result: RunResult) {
        const { outcome, reason, error } = columns(result)
        const finishedAt = DateTime.formatIso(yield* DateTime.now)
        yield* sql`UPDATE runs SET outcome = ${outcome}, reason = ${reason}, error = ${error},
          finished_at = ${finishedAt} WHERE id = ${id}`
      }, Effect.orDie)

      const list = Effect.fn("RunLog.list")(function*(options?: ListOptions) {
        return yield* findAll(options ?? {})
      }, Effect.orDie)

      const abandonStarted = Effect.gen(function*() {
        const finishedAt = DateTime.formatIso(yield* DateTime.now)
        yield* sql`UPDATE runs SET outcome = 'abandoned', finished_at = ${finishedAt} WHERE outcome = 'started'`
      }).pipe(Effect.orDie)

      return RunLog.of({ start, finish, list, abandonStarted })
    })
  )
}
