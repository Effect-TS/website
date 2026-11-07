import { Command, click, expect, given, role, scene, text } from "foldkit/scene"
import { test } from "vite-plus/test"
import {
  StartRun,
  StopRun,
} from "../../../src/features/visual-effect/program/command.ts"
import { Message } from "../../../src/features/visual-effect/program/message.ts"
import {
  init,
  update,
} from "../../../src/features/visual-effect/program/update.ts"
import { view } from "../../../src/features/visual-effect/program/view/index.ts"

const start = init({}).model

test("a click on the header starts the example with its control values", () => {
  scene(
    { update, view },
    given(start),
    click(role("button", { name: "Run Effect.all" })),
    Command.expectHas(
      StartRun({
        runId: 0,
        key: "concurrency/0",
        controls: { concurrency: "sequential" },
      }),
    ),
    Command.resolve(StartRun, Message.CompletedStartRun()),
  )
})

test("a run shows its steps, and the header offers to stop it", () => {
  scene(
    { update, view },
    given(start),
    click(role("button", { name: "Run Effect.all" })),
    Command.resolveAll([
      StartRun({
        runId: 0,
        key: "concurrency/0",
        controls: { concurrency: "sequential" },
      }),
      Message.StartedRun({ runId: 0, at: 100 }),
    ]),
    expect(role("button", { name: "Stop Effect.all" })).toExist(),
    click(role("button", { name: "Stop Effect.all" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
  )
})

test("a tab changes the example", () => {
  scene(
    { update, view },
    given(start),
    click(role("tab", { name: "Effect.race" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    expect(role("button", { name: "Run Effect.race" })).toExist(),
    click(role("tab", { name: "Schedule" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    expect(role("button", { name: /Run Effect.retry/ })).toExist(),
  )
})

test("a control option changes the snippet", () => {
  scene(
    { update, view },
    given(start),
    expect(text(/const result = Effect\.all\(\[nyc/)).toExist(),
    click(role("radio", { name: "unbounded" })),
    Command.resolve(StopRun, Message.CompletedStopRun()),
    expect(text(/concurrency: "unbounded"/)).toExist(),
  )
})
