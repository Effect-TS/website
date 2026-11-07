import { RadioGroup, Tabs } from "@foldkit/ui"
import { Option } from "effect"
import { Command, given, message, model, story } from "foldkit/story"
import { expect, test } from "vite-plus/test"
import {
  ChangeBubble,
  ChangeHeader,
  ChangeHighlight,
  ChangeNode,
  HighlightSnippet,
  MeasureHighlight,
  StartRun,
  StopRun,
  WaitHighlightDelay,
  WaitNotification,
} from "../../../src/features/visual-effect/program/command.ts"
import { allExample } from "../../../src/features/visual-effect/catalog/effect-all.tsx"
import { Message } from "../../../src/features/visual-effect/program/message.ts"
import {
  init,
  update,
} from "../../../src/features/visual-effect/program/update.ts"
import type { Model } from "../../../src/features/visual-effect/program/model.ts"

const OPTIONS = ["sequential", "numbered", "unbounded"]

/** The learner picks an option of the concurrency control. */
const choose = (value: string) =>
  Message.GotControlGroupMessage({
    controlId: "concurrency",
    message: RadioGroup.Message.SelectedOption({
      index: OPTIONS.indexOf(value),
      value,
    }),
  })
const focused = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.Message.CompletedFocusOption(),
)

const headerMoved = Command.resolve(
  ChangeHeader,
  Message.CompletedAnimateHeader(),
)
const nodeMoved = Command.resolve(ChangeNode, Message.CompletedAnimateNode())
const highlightMoved = Command.resolve(
  ChangeHighlight,
  Message.CompletedAnimateHighlight(),
)
const bubbleMoved = Command.resolve(
  ChangeBubble,
  Message.CompletedShakeBubble(),
)

const HIGHLIGHT_FAILED = Message.FailedHighlightSnippet({ message: "none" })

/** The first view with its snippet already highlighted, as the server leaves it. */
const first = update(
  init({ defaultLines: [] }).model,
  Message.HighlightedSnippet({
    source: allExample.code.resolve({}).source,
    lines: [],
  }),
).model
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
    headerMoved,
    model((current) => expect(current.run._tag).toBe("Idle")),
  )
})

test("the run reports in and the Model follows", () => {
  story(
    update,
    given(first),
    message(Message.StartedRun({ runId: 0, at: 100 })),
    nodeMoved,
    headerMoved,
    model((current) => expect(current.run._tag).toBe("Running")),
    message(Message.StartedStep({ runId: 0, stepIndex: 0, at: 110 })),
    nodeMoved,
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
    nodeMoved,
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
    nodeMoved,
    headerMoved,
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
    headerMoved,
    model((current) => expect(current.run._tag).toBe("Running")),
    message(
      Message.EndedRun({ runId: 0, at: 500, outcome: { _tag: "Interrupted" } }),
    ),
    nodeMoved,
    headerMoved,
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
    nodeMoved,
    headerMoved,
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
    Message.UpdatedFinalizers({
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
    Command.resolve(HighlightSnippet, HIGHLIGHT_FAILED),
    headerMoved,
    model((current) => {
      expect(current.exampleKey).toBe(FINALIZER_KEY)
      expect(current.category).toBe("scope")
      expect(current.run._tag).toBe("Idle")
    }),
    message(Message.ClickedExample({ key: "scope/1" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(HighlightSnippet, HIGHLIGHT_FAILED),
    model((current) => expect(current.exampleKey).toBe("scope/1")),
  )
  story(
    update,
    given(running()),
    message(choose("unbounded")),
    focused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(HighlightSnippet, HIGHLIGHT_FAILED),
    nodeMoved,
    headerMoved,
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
    headerMoved,
  )
})

test("a control set to its current value does nothing", () => {
  story(
    update,
    given(first),
    message(choose("sequential")),
    focused,
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
  const ticked = update(
    stepStarted,
    Message.TickedClock({ deltaTime: 200 }),
  ).model
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
  expect(
    update(ended, Message.TickedClock({ deltaTime: 100 })).model.clock,
  ).toBe(0)
})

test("a plain example keeps the clock at zero", () => {
  expect(running().clock).toBe(0)
})

test("the server leaves tokens for the default snippet, so no request goes out", () => {
  const lines = [
    [{ content: "const", start: 0, end: 5, style: { color: "red" } }],
  ]
  const booted = init({ defaultLines: lines })
  expect(booted.commands).toEqual([])
  expect(booted.model.maybeHighlighted).toEqual(
    Option.some({ source: allExample.code.resolve({}).source, lines }),
  )
})

test("without tokens the browser asks for them", () => {
  const booted = init({ defaultLines: [] })
  expect(booted.commands?.map(({ name }) => name)).toEqual(["HighlightSnippet"])
})

test("tokens for a snippet that is no longer on show are dropped", () => {
  const stale = update(
    first,
    Message.HighlightedSnippet({ source: "something else", lines: [] }),
  ).model
  expect(stale).toEqual(first)
})

test("a control change asks for the tokens of the new snippet", () => {
  story(
    update,
    given(first),
    message(choose("unbounded")),
    focused,
    Command.expectHas(
      HighlightSnippet({
        language: "typescript",
        source: allExample.code.resolve({ concurrency: "unbounded" }).source,
      }),
    ),
    Command.resolveAll(
      [StopRun, Message.CompletedStopRun()],
      [HighlightSnippet, HIGHLIGHT_FAILED],
    ),
  )
})

const resultTarget = { _tag: "Result" } as const

test("hovering a node marks its code and asks where it sits", () => {
  const ranges = allExample.code.resolve({}).highlightsByTarget.result ?? []
  story(
    update,
    given(first),
    message(Message.HoveredNode({ target: resultTarget })),
    Command.expectHas(MeasureHighlight({ ranges })),
    model((current) => {
      expect(current.maybeHighlightTarget).toEqual(Option.some(resultTarget))
      expect(current.maybeHovered).toEqual(Option.some(resultTarget))
    }),
    Command.resolve(
      MeasureHighlight,
      Message.MeasuredHighlight({
        maybeRect: Option.some({ x: 1, y: 2, width: 3, height: 4 }),
      }),
    ),
    highlightMoved,
    model((current) =>
      expect(current.maybeHighlightRect).toEqual(
        Option.some({ x: 1, y: 2, width: 3, height: 4 }),
      ),
    ),
  )
})

test("the mark stays a moment after the pointer leaves, and a new hover keeps it", () => {
  const left = update(
    update(first, Message.HoveredNode({ target: resultTarget })).model,
    Message.LeftNode(),
  )
  expect(left.commands?.map(({ name }) => name)).toEqual(["WaitHighlightDelay"])
  expect(left.model.maybeHovered).toEqual(Option.none())
  expect(left.model.maybeHighlightTarget).toEqual(Option.some(resultTarget))
  const step = { _tag: "Step", index: 0 } as const
  const hoveredAgain = update(
    left.model,
    Message.HoveredNode({ target: step }),
  ).model
  const late = update(
    hoveredAgain,
    Message.ElapsedHighlightDelay({ token: 2 }),
  ).model
  expect(late.maybeHighlightTarget).toEqual(Option.some(step))
})

test("the mark goes when its timer is the last one", () => {
  story(
    update,
    given(first),
    message(Message.HoveredNode({ target: resultTarget })),
    Command.resolve(
      MeasureHighlight,
      Message.MeasuredHighlight({ maybeRect: Option.none() }),
    ),
    message(Message.LeftNode()),
    Command.resolve(
      WaitHighlightDelay,
      Message.ElapsedHighlightDelay({ token: 2 }),
    ),
    model((current) => {
      expect(current.maybeHighlightTarget).toEqual(Option.none())
      expect(current.isHighlightVisible).toBe(false)
    }),
  )
})

test("a measure that comes back after the mark went is dropped", () => {
  const measured = update(
    first,
    Message.MeasuredHighlight({
      maybeRect: Option.some({ x: 1, y: 1, width: 1, height: 1 }),
    }),
  ).model
  expect(measured.maybeHighlightRect).toEqual(Option.none())
  expect(measured.isHighlightVisible).toBe(false)
})

test("a notification starts its timer, and expires into the list", () => {
  story(
    update,
    given(running()),
    message(
      Message.ShowedNotification({
        runId: 0,
        maybeStepIndex: Option.none(),
        message: "hi",
        durationMs: 2000,
        showOnHover: true,
      }),
    ),
    Command.expectHas(WaitNotification({ id: 0, durationMs: 2000 })),
    Command.resolve(WaitNotification, Message.ExpiredNotification({ id: 0 })),
    model((current) => expect(current.expiredNotifications).toEqual([0])),
  )
})

test("a reset clears what hover and time left behind", () => {
  const dirty = update(
    update(first, Message.HoveredNode({ target: resultTarget })).model,
    Message.ExpiredNotification({ id: 4 }),
  ).model
  const cleared = update(
    dirty,
    Message.ClickedExample({ key: "concurrency/1" }),
  ).model
  expect(cleared.expiredNotifications).toEqual([])
  expect(cleared.maybeHighlightTarget).toEqual(Option.none())
})

test("selecting a category tab selects its first example", () => {
  story(
    update,
    given(first),
    message(
      Message.GotCategoryTabsMessage({
        message: Tabs.Message.SelectedTab({ index: 1, value: "schedule" }),
      }),
    ),
    Command.resolveAll(
      [Tabs.FocusTab, Tabs.Message.CompletedFocusTab()],
      [StopRun, Message.CompletedStopRun()],
      [HighlightSnippet, HIGHLIGHT_FAILED],
    ),
    model((current) => {
      expect(current.category).toBe("schedule")
      expect(current.exampleKey).toBe("schedule/0")
    }),
  )
})

test("selecting an example tab selects that example", () => {
  story(
    update,
    given(first),
    message(
      Message.GotExampleTabsMessage({
        message: Tabs.Message.SelectedTab({ index: 2, value: "concurrency/2" }),
      }),
    ),
    Command.resolveAll(
      [Tabs.FocusTab, Tabs.Message.CompletedFocusTab()],
      [StopRun, Message.CompletedStopRun()],
      [HighlightSnippet, HIGHLIGHT_FAILED],
    ),
    model((current) => expect(current.exampleKey).toBe("concurrency/2")),
  )
})

test("selecting a control option changes the control, and keeps its own focus", () => {
  story(
    update,
    given(first),
    message(
      Message.GotControlGroupMessage({
        controlId: "concurrency",
        message: RadioGroup.Message.SelectedOption({
          index: 2,
          value: "unbounded",
        }),
      }),
    ),
    Command.resolveAll(
      [RadioGroup.FocusOption, RadioGroup.Message.CompletedFocusOption()],
      [StopRun, Message.CompletedStopRun()],
      [HighlightSnippet, HIGHLIGHT_FAILED],
    ),
    model((current) => {
      expect(current.controls["concurrency/0"]).toEqual({
        concurrency: "unbounded",
      })
      expect(Object.keys(current.controlGroups)).toEqual([
        "concurrency/0:concurrency",
      ])
    }),
  )
})

test("a strip reports whether more tabs wait on the right", () => {
  const moved = update(
    update(
      first,
      Message.UpdatedStripFade({ strip: "Categories", canScrollRight: true }),
    ).model,
    Message.UpdatedStripFade({ strip: "Examples", canScrollRight: true }),
  ).model
  expect(moved.categoriesCanScrollRight).toBe(true)
  expect(moved.examplesCanScrollRight).toBe(true)
})

test("the header button stops wiggling once it is used", () => {
  expect(first.hasInteracted).toBe(false)
  const used = update(first, Message.ClickedHeader())
  expect(used.model.hasInteracted).toBe(true)
  expect(
    update(used.model, Message.ClickedCategory({ category: "scope" })).model
      .hasInteracted,
  ).toBe(true)
})
