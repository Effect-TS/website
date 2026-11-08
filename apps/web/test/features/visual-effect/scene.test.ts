import {
  Command,
  Mount,
  click,
  expect,
  given,
  keydown,
  role,
  scene,
  testId,
  text,
} from "foldkit/scene"
import { RadioGroup, Tabs } from "@foldkit/ui"
import { Option } from "effect"
import { test } from "vite-plus/test"
import {
  HighlightSnippet,
  StartRun,
  StopRun,
} from "../../../src/features/visual-effect/program/command.ts"
import { Message } from "../../../src/features/visual-effect/program/message.ts"
import {
  init,
  update,
} from "../../../src/features/visual-effect/program/update.ts"
import {
  MeasureWidth,
  PulseChevrons,
  ScrollStrip,
} from "../../../src/features/visual-effect/program/mount.ts"
import {
  AnimateHeader,
  ChangeHeader,
} from "../../../src/features/visual-effect/program/targets/header.ts"
import {
  AnimateNode,
  ChangeNode,
} from "../../../src/features/visual-effect/program/targets/node.ts"
import { findEntry } from "../../../src/features/visual-effect/program/catalog.ts"
import { view } from "../../../src/features/visual-effect/program/view/index.ts"

const start = init({ defaultLines: [] }).model

/** A click on a tab moves focus to it. The Command answers with the Tabs' own Message. */
const tabFocused = Command.resolve(
  Tabs.FocusTab,
  Tabs.Message.CompletedFocusTab(),
)

const headerMoved = Command.resolve(
  ChangeHeader,
  Message.CompletedChangeHeader(),
)
const nodeMoved = Command.resolve(ChangeNode, Message.CompletedChangeNode())

/** A click on an option moves focus to it. The Command answers with the group's own Message. */
const optionFocused = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.Message.CompletedFocusOption(),
)

/** The two tab strips and the header button mount once. */
const strips = Mount.resolveAll(
  [
    ScrollStrip({ strip: "Categories" }),
    Message.UpdatedStripFade({ strip: "Categories", canScrollRight: false }),
  ],
  [
    ScrollStrip({ strip: "Examples" }),
    Message.UpdatedStripFade({ strip: "Examples", canScrollRight: false }),
  ],
  [AnimateHeader, Message.CompletedAnimateHeader()],
)

const nodeCount = (key: string): number =>
  Option.match(findEntry(key), {
    onNone: () => 0,
    onSome: ({ example }) => example.steps.length + 1,
  })

const mount = (count: number) =>
  Array.from(
    { length: count },
    () => [AnimateNode, Message.CompletedAnimateNode()] as const,
  )

/** Every node of an example mounts its animation: the steps and the result. */
const nodes = (key: string) => Mount.resolveAll(...mount(nodeCount(key)))

/**
 * Switching examples keeps the nodes both have, ends the ones that are gone and
 * mounts the ones that are new.
 */
const switched = (from: string, to: string) => [
  ...(nodeCount(from) > nodeCount(to)
    ? [
        Mount.expectEnded(
          ...Array.from(
            { length: nodeCount(from) - nodeCount(to) },
            () => AnimateNode,
          ),
        ),
      ]
    : []),
  ...(nodeCount(to) > nodeCount(from)
    ? [Mount.resolveAll(...mount(nodeCount(to) - nodeCount(from)))]
    : []),
]

test("a click on the header starts the example with its control values", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    click(role("button", { name: "Run Effect.all" })),
    Command.expectHas(
      StartRun({
        runId: 0,
        key: "concurrency/0",
        controls: { concurrency: "sequential" },
      }),
    ),
    Command.resolve(StartRun, Message.CompletedStartRun()),
    headerMoved,
  )
})

test("a run shows its steps, and the header offers to stop it", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    click(role("button", { name: "Run Effect.all" })),
    Command.resolveAll([
      StartRun({
        runId: 0,
        key: "concurrency/0",
        controls: { concurrency: "sequential" },
      }),
      Message.StartedRun({ runId: 0, at: 100 }),
    ]),
    Command.resolve(
      ChangeHeader({ tag: "Idle", hasInteracted: true, pointer: "Away" }),
      Message.CompletedChangeHeader(),
    ),
    Command.resolve(
      ChangeHeader({ tag: "Running", hasInteracted: true, pointer: "Away" }),
      Message.CompletedChangeHeader(),
    ),
    nodeMoved,
    expect(role("button", { name: "Stop Effect.all" })).toExist(),
    click(role("button", { name: "Stop Effect.all" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
  )
})

test("a tab changes the example", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    click(role("tab", { name: "Effect.race" })),
    tabFocused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(
      HighlightSnippet,
      Message.FailedHighlightSnippet({ message: "none" }),
    ),
    ...switched("concurrency/0", "concurrency/1"),
    expect(role("button", { name: "Run Effect.race" })).toExist(),
    click(role("tab", { name: "Schedule" })),
    tabFocused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(
      HighlightSnippet,
      Message.FailedHighlightSnippet({ message: "none" }),
    ),
    ...switched("concurrency/1", "schedule/0"),
    Mount.resolve(MeasureWidth, Message.UpdatedContainerWidth({ width: 800 })),
    expect(role("button", { name: /Run Effect.retry/ })).toExist(),
  )
})

test("a control option changes the snippet", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    expect(text(/const result = Effect\.all\(\[nyc/)).toExist(),
    click(role("radio", { name: "unbounded" })),
    optionFocused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(
      HighlightSnippet,
      Message.FailedHighlightSnippet({ message: "none" }),
    ),
    expect(text(/concurrency: "unbounded"/)).toExist(),
  )
})

test("the arrow keys move through the options of a control", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    keydown(role("radio", { name: "sequential" }), "ArrowRight"),
    optionFocused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(
      HighlightSnippet,
      Message.FailedHighlightSnippet({ message: "none" }),
    ),
    expect(role("radio", { name: "numbered", checked: true })).toExist(),
  )
})

test("a schedule example shows a timeline and no finalizers", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    expect(testId("visual-effect-timeline")).toBeAbsent(),
    click(role("tab", { name: "Schedule" })),
    tabFocused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(
      HighlightSnippet,
      Message.FailedHighlightSnippet({ message: "none" }),
    ),
    ...switched("concurrency/0", "schedule/0"),
    Mount.resolve(MeasureWidth, Message.UpdatedContainerWidth({ width: 800 })),
    expect(testId("visual-effect-timeline")).toExist(),
    expect(testId("visual-effect-finalizers")).toBeAbsent(),
  )
})

test("a scope example shows finalizers and no timeline", () => {
  scene(
    { update, view },
    given(start),
    strips,
    nodes("concurrency/0"),
    click(role("tab", { name: "Scope" })),
    tabFocused,
    Command.resolve(StopRun, Message.CompletedStopRun()),
    Command.resolve(
      HighlightSnippet,
      Message.FailedHighlightSnippet({ message: "none" }),
    ),
    ...switched("concurrency/0", "scope/0"),
    Mount.resolve(MeasureWidth, Message.UpdatedContainerWidth({ width: 800 })),
    Mount.resolve(PulseChevrons, Message.CompletedPulseChevrons()),
    expect(testId("visual-effect-finalizers")).toExist(),
    expect(testId("visual-effect-timeline")).toBeAbsent(),
  )
})
