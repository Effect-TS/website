import { Effect, Fiber, Queue } from "effect"
import { TestClock } from "effect/testing"
import { expect, test } from "vite-plus/test"
import { ENTRIES } from "../../../src/features/visual-effect/program/catalog.ts"
import type { Message } from "../../../src/features/visual-effect/program/message.ts"
import {
  events,
  run,
} from "../../../src/features/visual-effect/program/runner.ts"

const MAX_VIRTUAL_SECONDS = 600

/** Runs an example on a test clock and returns everything the run said. */
const runToEnd = (
  entry: (typeof ENTRIES)[number],
  controls: Readonly<Record<string, string>>,
  until: (seen: ReadonlyArray<Message>) => boolean = (seen) =>
    seen.some(({ _tag }) => _tag === "EndedRun"),
): Promise<ReadonlyArray<Message>> =>
  Effect.gen(function* () {
    yield* Queue.clear(events)
    const fiber = yield* Effect.forkChild(run(7, entry.example, controls))
    const seen: Array<Message> = []
    for (let second = 0; second < MAX_VIRTUAL_SECONDS; second += 1) {
      yield* Effect.yieldNow
      seen.push(...(yield* Queue.clear(events)))
      if (until(seen)) {
        break
      }
      yield* TestClock.adjust("1 second")
    }
    yield* Effect.forkChild(Fiber.interrupt(fiber))
    for (let second = 0; second < 5; second += 1) {
      yield* Effect.yieldNow
      yield* TestClock.adjust("1 second")
    }
    yield* Effect.yieldNow
    seen.push(...(yield* Queue.clear(events)))
    return seen
  }).pipe(Effect.provide(TestClock.layer()), Effect.scoped, Effect.runPromise)

test.each(ENTRIES.map((entry) => [entry.key, entry] as const))(
  "%s runs to its end",
  async (_key, entry) => {
    const messages = await runToEnd(entry, {})
    expect(messages[0]?._tag).toBe("StartedRun")
    expect(messages.filter(({ _tag }) => _tag === "EndedRun")).toHaveLength(1)
    expect(
      messages.every((message) => "runId" in message && message.runId === 7),
    ).toBe(true)
    const started = messages.filter(({ _tag }) => _tag === "StartedStep").length
    const ended = messages.filter(({ _tag }) => _tag === "EndedStep").length
    expect(ended).toBe(started)
  },
)

/** This option waits for the learner to stop it, so it has its own test. */
const WAITS_FOR_STOP = "scope/0 outcome=interrupt"

const OPTIONS = ENTRIES.flatMap((entry) =>
  entry.example.controls.flatMap((control) =>
    control.options.map((option) => [entry, control.id, option] as const),
  ),
).filter(
  ([entry, id, option]) => `${entry.key} ${id}=${option}` !== WAITS_FOR_STOP,
)

test.each(
  OPTIONS.map(
    ([entry, id, option]) =>
      [`${entry.key} ${id}=${option}`, entry, id, option] as const,
  ),
)("%s runs to its end", async (_name, entry, id, option) => {
  const messages = await runToEnd(entry, { [id]: option })
  expect(messages.some(({ _tag }) => _tag === "EndedRun")).toBe(true)
})

test("a run reports the steps its example declares", async () => {
  const entry = ENTRIES.find(({ key }) => key === "concurrency/0")
  if (entry === undefined) throw new Error("Missing example")
  const messages = await runToEnd(entry, {})
  const indexes = new Set(
    messages.flatMap((message) =>
      message._tag === "StartedStep" ? [message.stepIndex] : [],
    ),
  )
  expect([...indexes].sort()).toEqual([0, 1, 2, 3])
})

test("an example that never ends reports an interrupt when it is stopped", async () => {
  const entry = ENTRIES.find(({ key }) => key === "scope/0")
  if (entry === undefined) throw new Error("Missing example")
  const messages = await runToEnd(entry, { outcome: "interrupt" }, (seen) =>
    seen.some(({ _tag }) => _tag === "ShowedNotification"),
  )
  const ended = messages.filter(({ _tag }) => _tag === "EndedRun")
  expect(ended).toHaveLength(1)
  expect(ended[0]).toMatchObject({ outcome: { _tag: "Interrupted" } })
  const phases = messages.flatMap((message) =>
    message._tag === "ChangedFinalizers" ? [message.event._tag] : [],
  )
  expect(phases).toEqual(["Registered", "Started", "Finished"])
})
