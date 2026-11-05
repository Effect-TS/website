import { Effect, Fiber, Stream } from "effect"
import type {
  DevToolsProgramList,
  DevToolsPrograms,
} from "foldkit/devtools-host"
import { afterEach, assert, beforeEach, test } from "vite-plus/test"
import { devToolsRegistry } from "../../src/lib/foldkit/devtools-registry.ts"

const KEY = Symbol.for("effect-website/foldkit/devtools-registry")

const reset = () => Reflect.deleteProperty(globalThis, KEY)

beforeEach(reset)
afterEach(reset)

const fakeProgram = (name: string, log: Array<string>) => ({
  name,
  mount: (_programs: DevToolsPrograms) => {
    log.push(`mount ${name}`)
  },
  unmount: () => {
    log.push(`unmount ${name}`)
  },
})

test("one registry is shared across calls", () => {
  assert.strictEqual(devToolsRegistry(), devToolsRegistry())
})

test("the first Program mounts the overlay and is selected", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  assert.isNull(registry.selectedId())
  registry.register(fakeProgram("Alpha", log))
  assert.deepEqual(log, ["mount Alpha"])
  assert.strictEqual(registry.selectedId(), 1)
})

test("a late Program only notifies and leaves the overlay alone", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  let notified = 0
  registry.register(fakeProgram("Alpha", log))
  registry.subscribe(() => {
    notified++
  })
  registry.register(fakeProgram("Beta", log))
  assert.deepEqual(log, ["mount Alpha"])
  assert.strictEqual(registry.selectedId(), 1)
  assert.strictEqual(notified, 1)
})

test("selecting another Program unmounts the old overlay before mounting the new", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  registry.register(fakeProgram("Alpha", log))
  registry.register(fakeProgram("Beta", log))
  registry.select(2)
  assert.deepEqual(log, ["mount Alpha", "unmount Alpha", "mount Beta"])
  assert.strictEqual(registry.selectedId(), 2)
})

test("selecting the current or an unknown Program changes nothing", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  registry.register(fakeProgram("Alpha", log))
  registry.select(1)
  registry.select(99)
  assert.deepEqual(log, ["mount Alpha"])
  assert.strictEqual(registry.selectedId(), 1)
})

test("unregistering the selected Program moves the overlay to the next one", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  const unregisterAlpha = registry.register(fakeProgram("Alpha", log))
  registry.register(fakeProgram("Beta", log))
  unregisterAlpha()
  assert.deepEqual(log, ["mount Alpha", "unmount Alpha", "mount Beta"])
  assert.strictEqual(registry.selectedId(), 2)
})

test("unregistering an unselected Program keeps the overlay", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  registry.register(fakeProgram("Alpha", log))
  const unregisterBeta = registry.register(fakeProgram("Beta", log))
  unregisterBeta()
  assert.deepEqual(log, ["mount Alpha"])
  assert.strictEqual(registry.selectedId(), 1)
})

test("unregistering the last Program empties the registry", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  const unregister = registry.register(fakeProgram("Alpha", log))
  unregister()
  assert.deepEqual(log, ["mount Alpha", "unmount Alpha"])
  assert.isNull(registry.selectedId())
})

test("a Program registered after the registry emptied becomes selected", () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  registry.register(fakeProgram("Alpha", log))()
  registry.register(fakeProgram("Beta", log))
  assert.deepEqual(log, ["mount Alpha", "unmount Alpha", "mount Beta"])
  assert.strictEqual(registry.selectedId(), 2)
})

test("the overlay gets a live list: the current one first, then every change", async () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  let received: DevToolsPrograms | undefined
  registry.register({
    name: "Alpha",
    mount: (programs) => {
      received = programs
    },
    unmount: () => undefined,
  })
  assert.isDefined(received)
  const seen: Array<DevToolsProgramList> = []
  const fiber = Effect.runFork(
    Stream.runForEach((received as DevToolsPrograms).changes, (list) =>
      Effect.sync(() => {
        seen.push(list)
      }),
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  registry.register(fakeProgram("Beta", log))
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Effect.runPromise(Fiber.interrupt(fiber))

  assert.deepEqual(seen[0], {
    items: [{ id: 1, name: "Alpha" }],
    selectedId: 1,
  })
  assert.deepEqual(seen.at(-1), {
    items: [
      { id: 1, name: "Alpha" },
      { id: 2, name: "Beta" },
    ],
    selectedId: 1,
  })
})

test("the overlay selects a Program through its snapshot and select", async () => {
  const log: Array<string> = []
  const registry = devToolsRegistry()
  let received: DevToolsPrograms | undefined
  registry.register({
    name: "Alpha",
    mount: (programs) => {
      received = programs
    },
    unmount: () => undefined,
  })
  registry.register(fakeProgram("Beta", log))
  const programs = received as DevToolsPrograms
  assert.deepEqual(
    programs.snapshot().items.map(({ id }) => id),
    [1, 2],
  )
  programs.select(2)
  assert.strictEqual(registry.selectedId(), 1)
  await Promise.resolve()
  assert.strictEqual(registry.selectedId(), 2)
  assert.deepEqual(log, ["mount Beta"])
})

test("a subscriber stops hearing after it unsubscribes", () => {
  const registry = devToolsRegistry()
  let notified = 0
  const unsubscribe = registry.subscribe(() => {
    notified++
  })
  unsubscribe()
  registry.register(fakeProgram("Alpha", []))
  assert.strictEqual(notified, 0)
})
