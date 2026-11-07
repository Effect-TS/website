import { settle, start, withNotification } from "./run.ts"
import { Option, Schema } from "effect"
import { expect, test } from "vite-plus/test"
import {
  DEFAULT_KEY,
  ENTRIES,
  findEntry,
  stepKeyOf,
} from "../../../src/features/visual-effect/program/catalog.ts"
import {
  advanceTimeline,
  canReset,
  emptyFinalizerPanel,
  idle,
  reduceFinalizerPanel,
  type FinalizerEvent,
  type RunState,
  type TimelineSegment,
} from "../../../src/features/visual-effect/program/domain.ts"
import {
  Model,
  initialModel,
} from "../../../src/features/visual-effect/program/model.ts"

const shown = { size: "Small", text: "ok" } as const
const notification = {
  id: 1,
  message: "hi",
  durationMs: 2000,
  showOnHover: false,
}

test("the first Model is the default example, idle", () => {
  expect(initialModel.exampleKey).toBe(DEFAULT_KEY)
  expect(initialModel.run).toEqual(idle)
  expect(Option.isSome(findEntry(DEFAULT_KEY))).toBe(true)
})

test("the Model schema accepts a Model in the middle of a run", () => {
  const running = {
    ...initialModel,
    run: withNotification(start(10), notification),
    controls: { "concurrency/0": { concurrency: "unbounded" } },
  }
  expect(Schema.decodeUnknownSync(Model)(running)).toEqual(running)
})

test("example keys are unique and the same on every load", () => {
  const keys = ENTRIES.map((entry) => entry.key)
  expect(new Set(keys).size).toBe(keys.length)
  expect(keys).toHaveLength(22)
  expect(stepKeyOf("concurrency/0", 2)).toBe("concurrency/0:2")
})

test("a run that ended keeps the notification it showed and can reset", () => {
  const running = withNotification(start(100), notification)
  const ended = settle(running, { _tag: "Succeeded", value: shown }, 350)
  expect(ended).toMatchObject({
    _tag: "Succeeded",
    durationMs: 250,
    endedAt: 350,
    maybeNotification: Option.some(notification),
  })
  expect(canReset(ended)).toBe(true)
  expect(canReset(running)).toBe(false)
  expect(canReset(idle)).toBe(false)
})

test("every outcome maps to its own state", () => {
  const run = start(0)
  expect(settle(run, { _tag: "Failed", error: shown }, 5)._tag).toBe("Failed")
  expect(settle(run, { _tag: "Interrupted" }, 5)._tag).toBe("Interrupted")
  expect(settle(run, { _tag: "Died", defect: shown }, 5)._tag).toBe("Died")
})

test("an idle state takes no notification", () => {
  expect(withNotification(idle, notification)).toEqual(idle)
})

test("the timeline alternates running and waiting, and ignores a repeat", () => {
  const running: RunState = start(100)
  const ended = settle(running, { _tag: "Succeeded", value: shown }, 400)
  const first = advanceTimeline([], running, 50)
  expect(first).toEqual([
    { kind: "Running", startedAt: 50, maybeEndedAt: Option.none() },
  ])
  expect(advanceTimeline(first, running, 50)).toBe(first)
  const second: ReadonlyArray<TimelineSegment> = advanceTimeline(
    first,
    ended,
    50,
  )
  expect(second).toEqual([
    { kind: "Running", startedAt: 50, maybeEndedAt: Option.some(400) },
    { kind: "Waiting", startedAt: 400, maybeEndedAt: Option.none() },
  ])
  expect(advanceTimeline(second, idle, 50)).toBe(second)
})

test("finalizers register, release one by one, and reset", () => {
  const apply = (events: ReadonlyArray<FinalizerEvent>) =>
    events.reduce(reduceFinalizerPanel, emptyFinalizerPanel)
  const registered = apply([
    { _tag: "RunStarted" },
    { _tag: "Registered", id: "a", label: "a", registrationIndex: 0, at: 1 },
    { _tag: "Registered", id: "b", label: "b", registrationIndex: 1, at: 2 },
  ])
  expect(registered.status).toBe("Active")
  expect(registered.finalizers.map((entry) => entry.phase)).toEqual([
    "Pending",
    "Pending",
  ])
  const releasing = reduceFinalizerPanel(registered, {
    _tag: "Started",
    id: "b",
    at: 3,
  })
  expect(releasing.status).toBe("Releasing")
  const partly = reduceFinalizerPanel(releasing, {
    _tag: "Finished",
    id: "b",
    at: 4,
    phase: "Succeeded",
  })
  expect(partly.status).toBe("Releasing")
  const done = apply([
    { _tag: "RunStarted" },
    { _tag: "Registered", id: "a", label: "a", registrationIndex: 0, at: 1 },
    { _tag: "Started", id: "a", at: 2 },
    { _tag: "Finished", id: "a", at: 3, phase: "Failed" },
  ])
  expect(done.status).toBe("Released")
  expect(reduceFinalizerPanel(done, { _tag: "Reset" })).toEqual(
    emptyFinalizerPanel,
  )
})
