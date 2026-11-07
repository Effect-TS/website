import { Option } from "effect"
import { Command, given, message, model, story } from "foldkit/story"
import { expect, test } from "vite-plus/test"
import {
  StartRun,
  StopRun,
} from "../../../src/features/visual-effect/program/command.ts"
import { Message } from "../../../src/features/visual-effect/program/message.ts"
import {
  init,
  update,
} from "../../../src/features/visual-effect/program/update.ts"
import type { Model } from "../../../src/features/visual-effect/program/model.ts"

const first = init({}).model
const shown = { size: "Small", text: "ok" } as const

/** A Model after `StartedRun`, so a run is going. */
const running = (base: Model = first, at = 100): Model =>
  update(base, Message.StartedRun({ runId: base.runId, at })).model

const TIMELINE_KEY = "schedule/0"
const FINALIZER_KEY = "scope/0"

test("the first click starts the example with its control values", () => {
  story(
    update,
    given(first),
    message(Message.ClickedHeader()),
    Command.expectHas(
      StartRun({
        runId: 0,
        key: "concurrency/0",
        controls: { concurrency: "sequential" },
      }),
    ),
    Command.resolve(StartRun, Message.CompletedStartRun()),
    model((current) => expect(current.run._tag).toBe("Idle")),
  )
})

test("the run reports in and the Model follows", () => {
  story(
    update,
    given(first),
    message(Message.StartedRun({ runId: 0, at: 100 })),
    model((current) => expect(current.run._tag).toBe("Running")),
    message(Message.StartedStep({ runId: 0, stepIndex: 0, at: 110 })),
    model((current) =>
      expect(current.steps["concurrency/0:0"]?._tag).toBe("Running"),
    ),
    message(
      Message.EndedStep({
        runId: 0,
        stepIndex: 0,
        at: 400,
        outcome: { _tag: "Succeeded", value: shown },
      }),
    ),
    model((current) =>
      expect(current.steps["concurrency/0:0"]).toMatchObject({
        _tag: "Succeeded",
        durationMs: 290,
      }),
    ),
    message(
      Message.EndedRun({
        runId: 0,
        at: 900,
        outcome: { _tag: "Succeeded", value: shown },
      }),
    ),
    model((current) =>
      expect(current.run).toMatchObject({
        _tag: "Succeeded",
        durationMs: 800,
      }),
    ),
  )
})

test("a click while the run goes stops it, and the run says how it ended", () => {
  story(
    update,
    given(running()),
    message(Message.ClickedHeader()),
    Command.expectHas(StopRun()),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    model((current) => expect(current.run._tag).toBe("Running")),
    message(
      Message.EndedRun({ runId: 0, at: 500, outcome: { _tag: "Interrupted" } }),
    ),
    model((current) => expect(current.run._tag).toBe("Interrupted")),
  )
})

test("a click after the run ended resets it", () => {
  const ended = update(
    running(),
    Message.EndedRun({
      runId: 0,
      at: 200,
      outcome: { _tag: "Succeeded", value: shown },
    }),
  ).model
  story(
    update,
    given(ended),
    message(Message.ClickedHeader()),
    Command.expectHas(StopRun()),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    model((current) => {
      expect(current.run._tag).toBe("Idle")
      expect(current.runId).toBe(1)
      expect(current.steps).toEqual({})
    }),
  )
})

test("a Message from a run that a reset replaced is ignored", () => {
  const ended = update(
    running(),
    Message.EndedRun({
      runId: 0,
      at: 200,
      outcome: { _tag: "Succeeded", value: shown },
    }),
  ).model
  const afterReset = update(ended, Message.ClickedHeader()).model
  expect(afterReset.runId).toBe(1)
  const stale = update(
    afterReset,
    Message.StartedStep({ runId: 0, stepIndex: 0, at: 5 }),
  ).model
  expect(stale).toEqual(afterReset)
})

test("a late Message for a stopped run still lands: its finalizers go on", () => {
  const stopped = running(first)
  const next = update(
    stopped,
    Message.ChangedFinalizers({
      runId: 0,
      event: {
        _tag: "Registered",
        id: "a",
        label: "a",
        registrationIndex: 0,
        at: 5,
      },
    }),
  ).model
  expect(next.finalizers.finalizers).toHaveLength(1)
})

test("a category or example change resets, and a control change too", () => {
  story(
    update,
    given(running()),
    message(Message.ClickedCategory({ category: "scope" })),
    Command.expectHas(StopRun()),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    model((current) => {
      expect(current.exampleKey).toBe(FINALIZER_KEY)
      expect(current.category).toBe("scope")
      expect(current.run._tag).toBe("Idle")
    }),
    message(Message.ClickedExample({ key: "scope/1" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    model((current) => expect(current.exampleKey).toBe("scope/1")),
  )
  story(
    update,
    given(running()),
    message(
      Message.ChangedControl({ controlId: "concurrency", value: "unbounded" }),
    ),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    model((current) => {
      expect(current.controls["concurrency/0"]).toEqual({
        concurrency: "unbounded",
      })
      expect(current.run._tag).toBe("Idle")
    }),
    message(Message.ClickedHeader()),
    Command.expectHas(
      StartRun({
        runId: 1,
        key: "concurrency/0",
        controls: { concurrency: "unbounded" },
      }),
    ),
    Command.resolve(StartRun, Message.CompletedStartRun()),
  )
})

test("a control set to its current value does nothing", () => {
  story(
    update,
    given(first),
    message(
      Message.ChangedControl({ controlId: "concurrency", value: "sequential" }),
    ),
    Command.expectNone(),
  )
})

test("an unknown example is ignored", () => {
  story(
    update,
    given(first),
    message(Message.ClickedExample({ key: "nowhere/9" })),
    Command.expectNone(),
    model((current) => expect(current).toEqual(first)),
  )
})

test("a notification lands on its step, or on the run when there is no step", () => {
  const onStep = update(
    running(),
    Message.ShowedNotification({
      runId: 0,
      maybeStepIndex: Option.some(1),
      message: "hi",
      durationMs: 2000,
      showOnHover: false,
    }),
  ).model
  expect(onStep.steps["concurrency/0:1"]).toEqual({ _tag: "Idle" })
  const started = update(
    onStep,
    Message.StartedStep({ runId: 0, stepIndex: 1, at: 120 }),
  ).model
  const withNote = update(
    started,
    Message.ShowedNotification({
      runId: 0,
      maybeStepIndex: Option.some(1),
      message: "step",
      durationMs: 2000,
      showOnHover: true,
    }),
  ).model
  expect(withNote.steps["concurrency/0:1"]).toMatchObject({
    maybeNotification: Option.some({
      id: 1,
      message: "step",
      showOnHover: true,
    }),
  })
  const onRun = update(
    withNote,
    Message.ShowedNotification({
      runId: 0,
      maybeStepIndex: Option.none(),
      message: "run",
      durationMs: 2000,
      showOnHover: false,
    }),
  ).model
  expect(onRun.run).toMatchObject({
    maybeNotification: Option.some({ id: 2, message: "run" }),
  })
})

test("a timeline example follows the clock and builds segments from its steps", () => {
  const base = update(
    first,
    Message.ClickedExample({ key: TIMELINE_KEY }),
  ).model
  const started = update(
    base,
    Message.StartedRun({ runId: base.runId, at: 1000 }),
  ).model
  expect(started.clock).toBe(1000)
  const stepStarted = update(
    started,
    Message.StartedStep({ runId: base.runId, stepIndex: 0, at: 1000 }),
  ).model
  expect(stepStarted.timeline).toHaveLength(1)
  const ticked = update(stepStarted, Message.TickedClock({ at: 1200 })).model
  expect(ticked.clock).toBe(1200)
  const ended = update(
    ticked,
    Message.EndedRun({
      runId: base.runId,
      at: 1500,
      outcome: { _tag: "Succeeded", value: shown },
    }),
  ).model
  expect(ended.clock).toBe(0)
  expect(update(ended, Message.TickedClock({ at: 1600 })).model.clock).toBe(0)
})

test("a plain example keeps the clock at zero", () => {
  expect(running().clock).toBe(0)
})
