import { Effect } from "effect"
import { expect, test } from "vite-plus/test"
import {
  acquireDriver,
  makeSlot,
  makeTable,
} from "../../../src/features/visual-effect/program/target.ts"

const recorder = (name: string, seen: Array<string>) => ({
  apply: (input: number) => seen.push(`${name}:${input}`),
  dispose: () => undefined,
})

test("a slot gives input to its driver until the driver is removed", () => {
  const seen: Array<string> = []
  const slot = makeSlot<number>()
  slot.send(0)
  const remove = slot.register(recorder("a", seen))
  slot.send(1)
  remove()
  slot.send(2)
  expect(seen).toEqual(["a:1"])
})

test("an old driver does not empty the slot its replacement took", () => {
  const seen: Array<string> = []
  const slot = makeSlot<number>()
  const removeOld = slot.register(recorder("old", seen))
  slot.register(recorder("new", seen))
  removeOld()
  slot.send(1)
  expect(seen).toEqual(["new:1"])
})

test("a table finds a driver by key until it is removed", () => {
  const seen: Array<string> = []
  const table = makeTable<string, number>()
  const remove = table.register("a", recorder("a", seen))
  table.send("a", 1)
  table.send("b", 2)
  remove()
  table.send("a", 3)
  expect(seen).toEqual(["a:1"])
})

test("an old driver does not remove the driver that replaced it", () => {
  const seen: Array<string> = []
  const table = makeTable<string, number>()
  const removeOld = table.register("a", recorder("old", seen))
  table.register("a", recorder("new", seen))
  removeOld()
  table.send("a", 1)
  expect(seen).toEqual(["new:1"])
})

test("acquireDriver registers the driver, then removes and disposes it on release", async () => {
  const seen: Array<string> = []
  const slot = makeSlot<number>()
  const driver = {
    apply: (input: number) => seen.push(`apply:${input}`),
    dispose: () => seen.push("dispose"),
  }
  await Effect.runPromise(
    Effect.scoped(
      acquireDriver({} as Element, () => driver, slot.register).pipe(
        Effect.tap(() => Effect.sync(() => slot.send(1))),
      ),
    ),
  )
  slot.send(2)
  expect(seen).toEqual(["apply:1", "dispose"])
})
