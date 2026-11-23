import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { assert, describe, test } from "vite-plus/test"
import { loadScratchpadWorkspace } from "../../../src/features/scratchpad/load.ts"
import { SCRATCHPAD_SEED } from "../../../src/features/scratchpad/seed.ts"
import {
  SCRATCHPAD_PATH,
  shareErrorMessage,
  shareScratchpad,
  shareSourceFromSnapshot,
  type ShareSource,
} from "../../../src/features/scratchpad/share.ts"
import { makeMemoryWorkspace } from "../../../src/features/scratchpad/workspace.ts"
import { WorkspaceCompression } from "../../../src/features/share/compression.ts"
import {
  toFlatWorkspace,
  type FlatNodeMetadata,
} from "../../../src/features/share/flat.ts"
import { ShortenClient } from "../../../src/features/share/shorten/client.ts"
import { ShortenError } from "../../../src/features/share/shorten/domain.ts"

/** An in-memory shortener: `shorten` stores the text under a counter hash. */
const makeShortener = () => {
  const stored = new Map<string, string>()
  const layer = Layer.succeed(ShortenClient, {
    shorten: ({ payload }: { readonly payload: { readonly text: string } }) =>
      Effect.sync(() => {
        const hash = `h${stored.size + 1}`
        stored.set(hash, payload.text)
        return hash
      }),
    retrieve: ({ params }: { readonly params: { readonly hash: string } }) =>
      Effect.succeed(Option.fromNullishOr(stored.get(params.hash))),
  } as unknown as ShortenClient["Service"])
  return { stored, layer }
}

const run = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    ShortenClient | WorkspaceCompression | KeyValueStore.KeyValueStore
  >,
  shortener = makeShortener(),
) =>
  effect.pipe(
    Effect.provide(
      Layer.mergeAll(
        shortener.layer,
        WorkspaceCompression.layer,
        KeyValueStore.layerMemory,
      ),
    ),
    Effect.runPromise,
  )

/** `/play`'s hash load: decompress, decode and `normalizeWorkspace`. */
const openOnPlay = (text: string) =>
  WorkspaceCompression.use((compression) => compression.decompress(text))

const LOCKFILE = "lockfileVersion: '9.0'\n\nimporters:\n  .: {}\n"

/** The seed after an edit, with the lockfile the Container writes back. */
const editedSeed = Effect.gen(function* () {
  const workspace = yield* makeMemoryWorkspace({
    initialFiles: SCRATCHPAD_SEED.files,
  })
  yield* workspace.writeFile(
    "src/main.ts",
    'import * as Effect from "effect/Effect"\n\nEffect.runFork(Effect.log("shared"))\n',
  )
  yield* workspace.writeHostFile("pnpm-lock.yaml", LOCKFILE)
  yield* workspace.createFile("src/extra.ts", "export const extra = 1\n")
  return shareSourceFromSnapshot(
    yield* workspace.snapshot,
    SCRATCHPAD_SEED.metadata,
  )
})

describe("shareScratchpad", () => {
  test("a Scratchpad share opens on /play with identical files", async () => {
    const shortener = makeShortener()
    const { source, result } = await run(
      Effect.gen(function* () {
        const source = yield* editedSeed
        const result = yield* shareScratchpad(source)
        return { source, result }
      }),
      shortener,
    )
    assert.equal(result.url, `${SCRATCHPAD_PATH}#${result.hash}`)

    const onPlay = await run(openOnPlay(shortener.stored.get(result.hash)!))
    const flat = toFlatWorkspace(onPlay)
    assert.deepStrictEqual(flat.files, source.files)
    // package.json and pnpm-lock.yaml travel like any other file.
    assert.equal(flat.files["pnpm-lock.yaml"], LOCKFILE)
    assert.equal(
      flat.files["package.json"],
      SCRATCHPAD_SEED.files["package.json"],
    )
    // The fields /play needs to run it.
    const seedMetadata = SCRATCHPAD_SEED.metadata!
    assert.equal(onPlay.name, seedMetadata.name)
    assert.equal(onPlay.prepare, "pnpm install")
    assert.deepStrictEqual(onPlay.snapshots, [])
    assert.deepStrictEqual(
      onPlay.shells.map((shell) => shell.command),
      seedMetadata.shells.map((shell) => shell.command),
    )
    assert.equal(onPlay.initialFilePath, seedMetadata.initialFilePath)
    assert.equal(onPlay.effectVersion, "v4")
    // Tree order and `userManaged` survive; decoding only fills in defaults
    // (`language` from the path, `userManaged: false`).
    const summary = (nodes: ReadonlyArray<FlatNodeMetadata>) =>
      nodes.map((node) => [node._tag, node.path, node.userManaged ?? false])
    assert.deepStrictEqual(
      summary(flat.metadata!.nodes).filter(([, path]) =>
        seedMetadata.nodes.some((node) => node.path === path),
      ),
      summary(seedMetadata.nodes),
    )
  })

  test("the absolute URL uses the given origin", async () => {
    const result = await run(
      shareScratchpad(SCRATCHPAD_SEED, { origin: "https://effect.website" }),
    )
    assert.equal(result.url, `https://effect.website/scratchpad#${result.hash}`)
  })

  test("a /play share loads in the Scratchpad and shares again unchanged", async () => {
    const shortener = makeShortener()
    // A /play v4 share: the Playground's template with a userManaged file.
    const playSource: ShareSource = {
      files: {
        ...SCRATCHPAD_SEED.files,
        "src/Program.ts": 'import * as Effect from "effect/Effect"\n',
      },
      metadata: {
        ...SCRATCHPAD_SEED.metadata!,
        name: "playground-v4",
        initialFilePath: "src/Program.ts",
        nodes: [
          ...SCRATCHPAD_SEED.metadata!.nodes,
          {
            _tag: "File",
            path: "src/Program.ts",
            language: "typescript",
            userManaged: true,
          },
        ],
      },
    }
    const { first, second } = await run(
      Effect.gen(function* () {
        const shared = yield* shareScratchpad(playSource)
        const first = yield* loadScratchpadWorkspace({
          hash: `#${shared.hash}`,
          search: "",
        })
        const reshared = yield* shareScratchpad({
          files: first.files,
          metadata: first.metadata,
        })
        const second = yield* loadScratchpadWorkspace({
          hash: `#${reshared.hash}`,
          search: "",
        })
        return { first, second }
      }),
      shortener,
    )
    assert.equal(first.source, "hash")
    assert.equal(second.source, "hash")
    assert.deepStrictEqual(second.files, first.files)
    assert.deepStrictEqual(second.metadata, first.metadata)
    assert.equal(second.initialFilePath, "src/Program.ts")
    assert.equal(second.metadata!.name, "playground-v4")
  })

  test("a workspace over the 128 KB limit fails before the request", async () => {
    // Random text doesn't compress, so ~200 KB of it stays over the limit.
    const noise = Array.from({ length: 200 * 1024 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90)),
    ).join("")
    const shortener = makeShortener()
    const exit = await run(
      Effect.exit(
        shareScratchpad({
          files: { ...SCRATCHPAD_SEED.files, "src/noise.ts": noise },
          metadata: SCRATCHPAD_SEED.metadata,
        }),
      ),
      shortener,
    )
    assert.isTrue(Exit.isFailure(exit))
    const error = Exit.isFailure(exit)
      ? Option.getOrThrow(Exit.findErrorOption(exit))
      : undefined
    assert.instanceOf(error, ShortenError)
    assert.equal(shortener.stored.size, 0)
    assert.include(shareErrorMessage(error), "128 KB")
  })

  test("error messages", () => {
    assert.include(
      shareErrorMessage(new ShortenError({ reason: "Unknown", method: "x" })),
      "Couldn't create a share link",
    )
    assert.include(
      shareErrorMessage({ _tag: "HttpClientError" }),
      "Couldn't reach the share service",
    )
  })
})
