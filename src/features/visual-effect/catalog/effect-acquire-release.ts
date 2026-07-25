import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { ErrorResult } from "../ui/results/error"
import { PrimitiveResult } from "../ui/results/primitive"

export const acquireReleaseExample = defineExample({
  label: "Effect.acquireRelease",
  description: "Acquire resources with guaranteed cleanup",
  features: { finalizers: true },
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const makeDatabase = Effect.acquireRelease(
       |  connectDatabase(),
       |  (db) => Effect.sync(() => db.close())
       |)
       |
       |const makeCache = Effect.acquireRelease(
       |  connectCache(),
       |  (cache) => Effect.sync(() => cache.flush())
       |)
       |
       |const makeLogger = Effect.acquireRelease(
       |  openLogFile(),
       |  (file) => Effect.sync(() => file.close())
       |)
       |
       |const program = Effect.gen(function* () {
       |  const db = yield* makeDatabase
       |  const cache = yield* makeCache
       |  const logger = yield* makeLogger
       |  return yield* doWork(db, cache, logger)
       |})
       |
       |const result = Effect.scoped(program)`,
    ),
  },
  resultHighlight: HighlightSelector.Text({ text: "Effect.scoped(program)" }),
  build: ({ addStep, finalizers }) => {
    const state = { run: 0 }

    const database = Effect.gen(function* () {
      const delay = yield* Random.nextIntBetween(600, 900)
      yield* finalizers.add("Close database", Effect.sleep(delay))
      yield* Effect.sleep(delay)
      return new PrimitiveResult("DATABASE")
    })

    const cache = Effect.gen(function* () {
      const delay = yield* Random.nextIntBetween(600, 900)
      yield* finalizers.add("Flush cache", Effect.sleep(delay))
      yield* Effect.sleep(delay)
      return new PrimitiveResult("CACHE")
    })

    const logger = Effect.gen(function* () {
      const delay = yield* Random.nextIntBetween(600, 900)
      yield* finalizers.add("Close log file", Effect.sleep(delay))
      yield* Effect.sleep(delay)
      return new PrimitiveResult("LOGGER")
    })

    const databaseStep = addStep(database, {
      label: "database",
      highlight: HighlightSelector.LineRange({ startLine: 1, endLine: 4 }),
    })

    const cacheStep = addStep(cache, {
      label: "cache",
      highlight: HighlightSelector.LineRange({ startLine: 6, endLine: 10 }),
    })

    const loggerStep = addStep(logger, {
      label: "logger",
      highlight: HighlightSelector.LineRange({ startLine: 11, endLine: 15 }),
    })

    const program = Effect.gen(function* () {
      const notifications = yield* Notifications

      yield* databaseStep
      yield* cacheStep
      yield* loggerStep

      const delay = yield* Random.nextIntBetween(800, 1200)
      yield* Effect.sleep(delay)

      const currentRun = state.run
      state.run = (state.run + 1) % 4

      switch (currentRun) {
        case 0:
          return new PrimitiveResult("Work completed!")
        case 1:
          return yield* Effect.fail(new ErrorResult("Oops.")).pipe(
            Effect.tapError((error) =>
              notifications.notify(error.message, {
                showOnHover: true,
              }),
            ),
          )
        case 2:
          return yield* Effect.die(new ErrorResult("BANG!")).pipe(
            Effect.tapDefect((defect) =>
              notifications.notify(defect instanceof Error ? defect.message : "Died", {
                showOnHover: true,
              }),
            ),
          )
        default: {
          yield* Effect.sleep("500 millis")
          yield* notifications.notify("Interrupt Me!", {
            duration: "365 days",
          })
          return yield* Effect.never.pipe(Effect.as(new PrimitiveResult("Interrupted")))
        }
      }
    })

    const programStep = addStep(program, {
      label: "program",
      highlight: HighlightSelector.LineRange({ startLine: 16, endLine: 22 }),
    })

    return Effect.scoped(programStep)
  },
})
