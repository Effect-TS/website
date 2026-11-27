import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import { runAutosave } from "../../../src/features/scratchpad/autosave.ts"
import {
  loadScratchpadWorkspace,
  SCRATCHPAD_AUTOSAVE_KEY,
} from "../../../src/features/scratchpad/load.ts"
import {
  SCRATCHPAD_SEED,
  SCRATCHPAD_SEEDS,
} from "../../../src/features/scratchpad/seed.ts"
import {
  makeMemoryWorkspace,
  type WorkspaceService,
} from "../../../src/features/scratchpad/workspace.ts"
import { WorkspaceCompression } from "../../../src/features/share/compression.ts"
import type { FlatWorkspaceMetadata } from "../../../src/features/share/flat.ts"
import { ShortenClient } from "../../../src/features/share/shorten/client.ts"

/** A `KeyValueStore` over a plain map, so tests can see every write. */
const makeStorage = (options: { readonly failingWrites?: number } = {}) => {
  const map = new Map<string, string>()
  const writes: Array<string> = []
  let failuresLeft = options.failingWrites ?? 0
  const layer = Layer.succeed(
    KeyValueStore.KeyValueStore,
    KeyValueStore.makeStringOnly({
      get: (key) => Effect.sync(() => map.get(key)),
      set: (key, value): Effect.Effect<void> =>
        Effect.suspend(() => {
          if (failuresLeft > 0) {
            failuresLeft--
            return Effect.die(new DOMException("quota", "QuotaExceededError"))
          }
          return Effect.sync(() => {
            writes.push(key)
            map.set(key, value)
          })
        }),
      remove: (key) =>
        Effect.sync(() => {
          map.delete(key)
        }),
      clear: Effect.sync(() => map.clear()),
      size: Effect.sync(() => map.size),
      keys: Effect.sync(() => [...map.keys()]),
    }),
  )
  return { map, writes, layer }
}

const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 20 }))

interface Session {
  readonly workspace: WorkspaceService
  readonly tick: (seconds: number) => Effect.Effect<void>
}

/**
 * Runs `body` against a Workspace opened with `initialFiles` while the
 * autosave runs on a TestClock.
 */
const withAutosave = <A>(
  storage: ReturnType<typeof makeStorage>,
  initialFiles: Readonly<Record<string, string>>,
  metadata: FlatWorkspaceMetadata | undefined,
  body: (session: Session) => Effect.Effect<A, unknown>,
) =>
  Effect.gen(function* () {
    const workspace = yield* makeMemoryWorkspace({ initialFiles })
    const fiber = yield* runAutosave({
      workspace,
      metadata: Effect.succeed(metadata),
      initialFiles,
    }).pipe(Effect.forkChild)
    // Let the autosave subscribe to the Workspace events.
    yield* settle
    const result = yield* body({
      workspace,
      // Let the event reach the debounce before moving the clock.
      tick: (seconds) =>
        settle.pipe(
          Effect.andThen(TestClock.adjust(`${seconds} seconds`)),
          Effect.andThen(settle),
        ),
    })
    yield* Fiber.interrupt(fiber)
    return result
  }).pipe(
    Effect.provide(Layer.merge(storage.layer, TestClock.layer())),
    Effect.runPromise,
  )

const EDIT =
  'import * as Effect from "effect/Effect"\n\nEffect.runFork(Effect.log("edited"))\n'

const loadAutosave = (storage: ReturnType<typeof makeStorage>) =>
  loadScratchpadWorkspace({ hash: "", search: "" }).pipe(
    Effect.provide(
      Layer.mergeAll(
        storage.layer,
        WorkspaceCompression.layer,
        Layer.succeed(ShortenClient, {} as ShortenClient["Service"]),
      ),
    ),
    Effect.runPromise,
  )

describe("runAutosave", () => {
  test("saves 2 seconds after the last change", async () => {
    const storage = makeStorage()
    await withAutosave(
      storage,
      SCRATCHPAD_SEED.files,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile("src/main.ts", "// one\n")
          yield* tick(1)
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* tick(1.5)
          assert.deepStrictEqual(storage.writes, [])
          yield* tick(1)
          assert.deepStrictEqual(storage.writes, [SCRATCHPAD_AUTOSAVE_KEY])
        }),
    )
  })

  test("a workspace edited back to what it opened with is not saved", async () => {
    const storage = makeStorage()
    const imported = { ...SCRATCHPAD_SEED.files, "src/main.ts": EDIT }
    await withAutosave(
      storage,
      imported,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile("src/main.ts", "// changed\n")
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [])
  })

  test("switching to the other version's seed is not saved", async () => {
    const storage = makeStorage()
    const imported = { ...SCRATCHPAD_SEED.files, "src/main.ts": EDIT }
    await withAutosave(
      storage,
      imported,
      SCRATCHPAD_SEEDS.v3.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.restoreSnapshot({
            version: 1,
            files: SCRATCHPAD_SEEDS.v3.files,
          })
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [])
  })

  test("after a failed write, the next change saves", async () => {
    const storage = makeStorage({ failingWrites: 1 })
    await withAutosave(
      storage,
      SCRATCHPAD_SEED.files,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* tick(3)
          yield* workspace.writeFile("src/main.ts", "// again\n")
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [SCRATCHPAD_AUTOSAVE_KEY])
  })

  test("the next visit opens the autosave, lockfile and empty directories included", async () => {
    const storage = makeStorage()
    const lockfile = "lockfileVersion: '9.0'\n"
    await withAutosave(
      storage,
      SCRATCHPAD_SEED.files,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* workspace.writeHostFile("pnpm-lock.yaml", lockfile)
          yield* workspace.createDirectory("src/empty")
          yield* tick(3)
        }),
    )
    const loaded = await loadAutosave(storage)
    assert.deepStrictEqual(
      {
        source: loaded.source,
        main: loaded.files["src/main.ts"],
        lockfile: loaded.files["pnpm-lock.yaml"],
        empty: loaded.metadata!.nodes.find((node) => node.path === "src/empty"),
      },
      {
        source: "autosave",
        main: EDIT,
        lockfile,
        empty: { _tag: "Directory", path: "src/empty", userManaged: false },
      },
    )
  })
})
