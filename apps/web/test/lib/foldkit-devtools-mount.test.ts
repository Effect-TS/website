import { Effect, Option } from "effect"
import type {
  DevToolsControllerPort,
  DevToolsPrograms,
} from "foldkit/devtools-host"
import { astroPlacement } from "../../src/lib/foldkit/devtools-placement.ts"
import { afterEach, assert, beforeEach, test, vi } from "vite-plus/test"

const calls = vi.hoisted(() => ({
  overlay: [] as Array<{ options: unknown; closed: boolean }>,
}))

vi.mock("@foldkit/devtools/vite", () => ({
  overlay: (...args: ReadonlyArray<unknown>) =>
    Effect.gen(function* () {
      const entry = { options: args[6], closed: false }
      calls.overlay.push(entry)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          entry.closed = true
        }),
      )
    }),
}))

const styles: Array<{ id: string }> = []

beforeEach(() => {
  calls.overlay.length = 0
  styles.length = 0
  vi.stubGlobal("document", {
    getElementById: (id: string) =>
      id === "foldkit-devtools-stacking"
        ? (styles[0] ?? null)
        : { shadowRoot: {} },
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: (style: { id: string }) => styles.push(style) },
  })
})

afterEach(() => vi.unstubAllGlobals())

const start = async () => {
  const { mountProgram } =
    await import("../../src/lib/foldkit/devtools-mount.ts")
  const program = mountProgram(
    {} as never,
    "BottomRight",
    "Development" as never,
    Option.none(),
  )
  program.mount({} as DevToolsPrograms, {} as DevToolsControllerPort)
  return program
}

test("mount starts the Overlay without a Badge and with the Astro Placement", async () => {
  await start()
  assert.strictEqual(calls.overlay.length, 1)
  assert.deepEqual(calls.overlay[0]?.options, {
    showBadge: false,
    placement: astroPlacement,
  })
  assert.strictEqual(styles.length, 1)
})

test("unmount closes the Overlay scope", async () => {
  const program = await start()
  program.unmount()
  assert.strictEqual(calls.overlay[0]?.closed, true)
})

test("unmount without a mount does nothing", async () => {
  const { mountProgram } =
    await import("../../src/lib/foldkit/devtools-mount.ts")
  mountProgram(
    {} as never,
    "BottomRight",
    "Development" as never,
    Option.none(),
  ).unmount()
  assert.strictEqual(calls.overlay.length, 0)
})
