import { Option } from "effect"
import { expect, test } from "vite-plus/test"
import { makeRegistry } from "../../../src/features/visual-effect/program/registry.ts"
import { motionCommands } from "../../../src/features/visual-effect/program/motion-commands.ts"
import { Message } from "../../../src/features/visual-effect/program/message.ts"
import type { Model } from "../../../src/features/visual-effect/program/model.ts"
import {
  init,
  update,
} from "../../../src/features/visual-effect/program/update.ts"

const first = init({ defaultLines: [] }).model
const names = (previous: Model, next: Model) =>
  motionCommands(previous, next).map(({ name }) => name)

const failed = (): Model => {
  const started = update(first, Message.StartedRun({ runId: 0, at: 0 })).model
  const shown = update(
    started,
    Message.ShowedNotification({
      runId: 0,
      maybeStepIndex: Option.none(),
      message: "boom",
      durationMs: 2000,
      showOnHover: false,
    }),
  ).model
  return update(
    shown,
    Message.EndedRun({
      runId: 0,
      at: 5,
      outcome: { _tag: "Failed", error: { size: "Small", text: "boom" } },
    }),
  ).model
}

test("a Model that did not change asks for no motion", () => {
  expect(motionCommands(first, first)).toEqual([])
})

test("a node and the header move when the run starts", () => {
  const started = update(first, Message.StartedRun({ runId: 0, at: 0 })).model
  expect(names(first, started)).toEqual(["ChangeNode", "ChangeHeader"])
})

test("a step moves only when its state changes", () => {
  const started = update(first, Message.StartedRun({ runId: 0, at: 0 })).model
  const step = update(
    started,
    Message.StartedStep({ runId: 0, stepIndex: 0, at: 1 }),
  ).model
  expect(motionCommands(started, step)).toMatchObject([
    { name: "ChangeNode", args: { id: "concurrency/0:0", tag: "Running" } },
  ])
  expect(motionCommands(step, step)).toEqual([])
})

test("a new example mounts its own nodes, so no node moves", () => {
  const started = update(first, Message.StartedRun({ runId: 0, at: 0 })).model
  const switched = update(
    started,
    Message.ClickedExample({ key: "concurrency/1" }),
  ).model
  expect(names(started, switched)).toEqual(["ChangeHeader"])
})

test("the pointer moves the header", () => {
  const over = update(first, Message.EnteredHeader()).model
  expect(motionCommands(first, over)).toMatchObject([
    { name: "ChangeHeader", args: { pointer: "Over" } },
  ])
  const pressed = update(over, Message.PressedHeader()).model
  expect(motionCommands(over, pressed)).toMatchObject([
    { name: "ChangeHeader", args: { pointer: "Pressed" } },
  ])
})

test("the highlight moves when the box or its fade changes", () => {
  const rect = { x: 1, y: 2, width: 3, height: 4 }
  const hovered = update(
    first,
    Message.HoveredNode({ target: { _tag: "Result" } }),
  ).model
  const measured = update(
    hovered,
    Message.MeasuredHighlight({ maybeRect: Option.some(rect) }),
  ).model
  expect(motionCommands(hovered, measured)).toMatchObject([
    { name: "ChangeHighlight", args: { ...rect, isVisible: true } },
  ])
  expect(motionCommands(measured, measured)).toEqual([])
})

test("a failure bubble shakes again when it comes back, and not before", () => {
  const model = failed()
  const hidden = update(model, Message.ExpiredNotification({ id: 0 })).model
  expect(motionCommands(model, hidden)).toMatchObject([
    { name: "ChangeBubble", args: { id: 0, isVisible: false } },
  ])
  const hovered = update(
    hidden,
    Message.HoveredNode({ target: { _tag: "Result" } }),
  ).model
  expect(
    motionCommands(hidden, hovered).filter(
      ({ name }) => name === "ChangeBubble",
    ),
  ).toEqual([])
})

test("a registry finds a driver by id until it is removed", () => {
  const registry = makeRegistry<number>()
  const seen: Array<number> = []
  const remove = registry.register("a", {
    apply: (value) => seen.push(value),
    dispose: () => undefined,
  })
  registry.apply("a", 1)
  registry.apply("b", 2)
  remove()
  registry.apply("a", 3)
  expect(seen).toEqual([1])
})

test("an old driver does not remove the driver that replaced it", () => {
  const registry = makeRegistry<number>()
  const seen: Array<string> = []
  const removeOld = registry.register("a", {
    apply: () => seen.push("old"),
    dispose: () => undefined,
  })
  registry.register("a", {
    apply: () => seen.push("new"),
    dispose: () => undefined,
  })
  removeOld()
  registry.apply("a", 1)
  expect(seen).toEqual(["new"])
})
