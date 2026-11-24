import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import { runAutosave } from "../../../src/features/scratchpad/autosave.ts"
import {
  loadScratchpadWorkspace,
  PLAYGROUND_AUTOSAVE_KEY,
  SCRATCHPAD_AUTOSAVE_KEY,
} from "../../../src/features/scratchpad/load.ts"
import { SCRATCHPAD_SEED } from "../../../src/features/scratchpad/seed.ts"
import {
  makeMemoryWorkspace,
  type WorkspaceService,
} from "../../../src/features/scratchpad/workspace.ts"
import { WorkspaceCompression } from "../../../src/features/share/compression.ts"
import type { FlatWorkspaceMetadata } from "../../../src/features/share/flat.ts"
import { ShortenClient } from "../../../src/features/share/shorten/client.ts"
import { Workspace } from "../../../src/features/share/workspace.ts"

const AutosaveSchema = Schema.Option(Workspace)

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

const readAutosave = (storage: ReturnType<typeof makeStorage>, key: string) =>
  Effect.gen(function* () {
    const store = KeyValueStore.toSchemaStore(
      yield* KeyValueStore.KeyValueStore,
      AutosaveSchema,
    )
    return Option.flatten(yield* store.get(key))
  }).pipe(Effect.provide(storage.layer), Effect.runSync)

const EDIT =
  'import * as Effect from "effect/Effect"\n\nEffect.runFork(Effect.log("edited"))\n'

describe("runAutosave", () => {
  test("writes the Workspace 2 seconds after the last change", async () => {
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
    const saved = Option.getOrThrow(
      readAutosave(storage, SCRATCHPAD_AUTOSAVE_KEY),
    )
    assert.equal(saved.name, SCRATCHPAD_SEED.metadata!.name)
    assert.equal(saved.prepare, "pnpm install")
    assert.equal(
      Option.getOrThrow(saved.findFile("src/main.ts"))[0].initialContent,
      EDIT,
    )
    // /play's key is never written.
    assert.isFalse(storage.map.has(PLAYGROUND_AUTOSAVE_KEY))
  })

  test("skips a Workspace unchanged from the seed", async () => {
    const storage = makeStorage()
    await withAutosave(
      storage,
      SCRATCHPAD_SEED.files,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          // An edit and its undo: events fire, the content is the seed's.
          const original = SCRATCHPAD_SEED.files["src/main.ts"]!
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* workspace.writeFile("src/main.ts", original)
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [])
  })

  test("skips a Workspace unchanged from the import", async () => {
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
          assert.deepStrictEqual(storage.writes, [])
          yield* workspace.createFile("src/new.ts", "export {}\n")
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [SCRATCHPAD_AUTOSAVE_KEY])
  })

  test("after a reload from the autosave, editing back to the seed doesn't save", async () => {
    const storage = makeStorage()
    await withAutosave(
      storage,
      SCRATCHPAD_SEED.files,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [SCRATCHPAD_AUTOSAVE_KEY])

    const loaded = await loadScratchpadWorkspace({ hash: "", search: "" }).pipe(
      Effect.provide(
        Layer.mergeAll(
          storage.layer,
          WorkspaceCompression.layer,
          Layer.succeed(ShortenClient, {} as ShortenClient["Service"]),
        ),
      ),
      Effect.runPromise,
    )
    assert.equal(loaded.source, "autosave")
    await withAutosave(
      storage,
      loaded.files,
      loaded.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile(
            "src/main.ts",
            SCRATCHPAD_SEED.files["src/main.ts"]!,
          )
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [SCRATCHPAD_AUTOSAVE_KEY])
  })

  test("a failed write is logged and the next change tries again", async () => {
    const storage = makeStorage({ failingWrites: 1 })
    await withAutosave(
      storage,
      SCRATCHPAD_SEED.files,
      SCRATCHPAD_SEED.metadata,
      ({ workspace, tick }) =>
        Effect.gen(function* () {
          yield* workspace.writeFile("src/main.ts", EDIT)
          yield* tick(3)
          assert.deepStrictEqual(storage.writes, [])
          yield* workspace.writeFile("src/main.ts", "// again\n")
          yield* tick(3)
        }),
    )
    assert.deepStrictEqual(storage.writes, [SCRATCHPAD_AUTOSAVE_KEY])
    const saved = Option.getOrThrow(
      readAutosave(storage, SCRATCHPAD_AUTOSAVE_KEY),
    )
    assert.equal(
      Option.getOrThrow(saved.findFile("src/main.ts"))[0].initialContent,
      "// again\n",
    )
  })

  test("the loader reads the autosave back, lockfile and empty directories included", async () => {
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
    const loaded = await loadScratchpadWorkspace({ hash: "", search: "" }).pipe(
      Effect.provide(
        Layer.mergeAll(
          storage.layer,
          WorkspaceCompression.layer,
          Layer.succeed(ShortenClient, {} as ShortenClient["Service"]),
        ),
      ),
      Effect.runPromise,
    )
    assert.equal(loaded.source, "autosave")
    assert.equal(loaded.files["src/main.ts"], EDIT)
    assert.equal(loaded.files["pnpm-lock.yaml"], lockfile)
    assert.equal(loaded.metadata!.name, SCRATCHPAD_SEED.metadata!.name)
    assert.deepStrictEqual(
      loaded.metadata!.nodes.find((node) => node.path === "src/empty"),
      { _tag: "Directory", path: "src/empty", userManaged: false },
    )
  })
})
