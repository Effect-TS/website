import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as Schema from "effect/Schema"
import { assert, describe, test } from "vite-plus/test"
import {
  loadScratchpadWorkspace,
  PLAYGROUND_AUTOSAVE_KEY,
  SCRATCHPAD_AUTOSAVE_KEY,
  type LoadedScratchpadWorkspace,
  type ScratchpadLocation,
} from "../../../src/features/scratchpad/load.ts"
import { SCRATCHPAD_SEEDS } from "../../../src/features/scratchpad/seed.ts"
import { SCRATCHPAD_EFFECT_VERSION_KEY } from "../../../src/features/scratchpad/version.ts"
import {
  Compression,
  WorkspaceCompression,
} from "../../../src/features/share/compression.ts"
import { ShortenClient } from "../../../src/features/share/shorten/client.ts"
import { Workspace } from "../../../src/features/share/workspace.ts"

// Share-format JSON as `/play` wrote it at different points in time. Encoded
// with the real compression below, so loading goes through the same decode,
// normalize and convert steps as a live share.

/** A v4 share from the beta: exact versions, extensionless import. */
const v4ShareJson = {
  name: "playground-v4",
  initialFilePath: "src/Program.ts",
  prepare: "pnpm install -E effect@4.0.0-beta.5",
  shells: [{ command: "../run src/main.ts" }],
  snapshots: [],
  tree: [
    {
      _tag: "File",
      name: "package.json",
      language: "json",
      userManaged: false,
      initialContent: JSON.stringify(
        {
          type: "module",
          dependencies: {
            "@effect/platform-node": "4.0.0-beta.5",
            effect: "4.0.0-beta.5",
          },
        },
        undefined,
        2,
      ),
    },
    {
      _tag: "File",
      name: "tsconfig.json",
      language: "json",
      initialContent: JSON.stringify(
        {
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
          },
        },
        undefined,
        2,
      ),
    },
    {
      _tag: "Directory",
      name: "src",
      userManaged: true,
      children: [
        {
          _tag: "File",
          name: "main.ts",
          initialContent:
            'import { program } from "./Program"\nimport * as Effect from "effect/Effect"\nEffect.runFork(program)\n',
        },
        {
          _tag: "File",
          name: "Program.ts",
          userManaged: true,
          initialContent:
            'import * as Effect from "effect/Effect"\nexport const program = Effect.log("v4 share")\n',
        },
      ],
    },
  ],
}

/** A v3 share from before the version toggle: npm, CommonJS, `@effect/platform`. */
const v3ShareJson = {
  name: "playground",
  prepare: "npm install",
  shells: [{ command: "../run src/main.ts" }],
  tree: [
    {
      _tag: "File",
      name: "package.json",
      language: "json",
      initialContent: JSON.stringify({
        dependencies: {
          "@effect/platform": "latest",
          "@effect/platform-node": "latest",
          effect: "latest",
        },
      }),
    },
    {
      _tag: "Directory",
      name: "src",
      children: [
        {
          _tag: "File",
          name: "main.ts",
          initialContent:
            'import { Effect } from "effect"\nEffect.runFork(Effect.log("v3 share"))\n',
        },
      ],
    },
  ],
}

/** A v4 share with more files than the Workspace allows. */
const overLimitShareJson = {
  ...v4ShareJson,
  initialFilePath: "src/main.ts",
  tree: [
    ...v4ShareJson.tree.slice(0, 2),
    {
      _tag: "Directory",
      name: "src",
      children: Array.from({ length: 60 }, (_, i) => ({
        _tag: "File",
        name: i === 0 ? "main.ts" : `module${i}.ts`,
        initialContent: `export const n = ${i}\n`,
      })),
    },
  ],
}

const decodeWorkspace = Schema.decodeUnknownSync(Workspace)

const compressJson = (json: unknown) =>
  Effect.runPromise(
    Compression.use((compression) =>
      compression.compressBase64(JSON.stringify(json)),
    ).pipe(Effect.provide(Compression.layer)),
  )

const encodeCode = (code: string) =>
  Base64Url.encode(new TextEncoder().encode(code))

interface Fixture {
  readonly location?: Partial<ScratchpadLocation>
  readonly shares?: Readonly<Record<string, string>>
  /** A share-format workspace, or `"cleared"` for the empty one a Reset stores. */
  readonly autosave?: unknown
  readonly playgroundAutosave?: unknown
  /** The raw stored version preference, as `/play` stores its own. */
  readonly versionPreference?: string
}

const AutosaveSchema = Schema.Option(Workspace)

const load = (fixture: Fixture): Promise<LoadedScratchpadWorkspace> => {
  const shortener = Layer.succeed(ShortenClient, {
    retrieve: ({ params }: { readonly params: { readonly hash: string } }) =>
      Effect.succeed(Option.fromNullishOr(fixture.shares?.[params.hash])),
  } as unknown as ShortenClient["Service"])
  return Effect.gen(function* () {
    const store = KeyValueStore.toSchemaStore(
      yield* KeyValueStore.KeyValueStore,
      AutosaveSchema,
    )
    if (fixture.autosave !== undefined) {
      yield* store.set(
        SCRATCHPAD_AUTOSAVE_KEY,
        fixture.autosave === "cleared"
          ? Option.none()
          : Option.some(decodeWorkspace(fixture.autosave)),
      )
    }
    if (fixture.versionPreference !== undefined) {
      yield* (yield* KeyValueStore.KeyValueStore).set(
        SCRATCHPAD_EFFECT_VERSION_KEY,
        fixture.versionPreference,
      )
    }
    if (fixture.playgroundAutosave !== undefined) {
      yield* store.set(
        PLAYGROUND_AUTOSAVE_KEY,
        Option.some(decodeWorkspace(fixture.playgroundAutosave)),
      )
    }
    return yield* loadScratchpadWorkspace({
      hash: fixture.location?.hash ?? "",
      search: fixture.location?.search ?? "",
    })
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        shortener,
        WorkspaceCompression.layer,
        KeyValueStore.layerMemory,
      ),
    ),
    Effect.runPromise,
  )
}

/** Whether the Scratchpad opened the seed for `version`. */
const assertSeed = (
  loaded: LoadedScratchpadWorkspace,
  version: "v3" | "v4" = "v4",
) => {
  assert.equal(loaded.source, "seed")
  assert.deepStrictEqual(loaded.files, SCRATCHPAD_SEEDS[version].files)
}

describe("loadScratchpadWorkspace", () => {
  test("loads the seed when there's nothing else", async () => {
    assertSeed(await load({}))
  })

  test("loads a share from the hash and opens its initial file", async () => {
    const loaded = await load({
      location: { hash: "#v4share" },
      shares: { v4share: await compressJson(v4ShareJson) },
    })
    assert.equal(loaded.source, "hash")
    assert.equal(loaded.initialFilePath, "src/Program.ts")
  })

  test("a v3 share loads as v3", async () => {
    const loaded = await load({
      location: { hash: "#v3share" },
      shares: { v3share: await compressJson(v3ShareJson) },
    })
    assert.equal(loaded.effectVersion, "v3")
  })

  test("an over-limit share loads the seed with a notice linking to it on /play", async () => {
    const loaded = await load({
      location: { hash: "#big" },
      shares: { big: await compressJson(overLimitShareJson) },
    })
    assertSeed(loaded)
    assert.equal(Option.getOrThrow(loaded.notice).playgroundUrl, "/play#big")
  })

  test("a corrupt hash falls through to the next source", async () => {
    const loaded = await load({
      location: { hash: "#corrupt", search: `?code=${encodeCode("x")}` },
      shares: { corrupt: "not compressed!" },
    })
    assert.equal(loaded.source, "code")
  })

  test("a ?code link swaps main.ts into the seed for its version", async () => {
    const code =
      'import * as Effect from "effect/Effect"\nEffect.runFork(Effect.log("hi"))\n'
    const loaded = await load({
      location: { search: `?code=${encodeCode(code)}&version=v4` },
      autosave: v4ShareJson,
    })
    assert.deepStrictEqual(loaded.files, {
      ...SCRATCHPAD_SEEDS.v4.files,
      "src/main.ts": code,
    })
  })

  test("a ?code link without a version is v3, like on /play", async () => {
    const loaded = await load({
      location: { search: `?code=${encodeCode("x")}` },
      versionPreference: JSON.stringify("v4"),
    })
    assert.equal(loaded.effectVersion, "v3")
  })

  test("the Scratchpad autosave wins over /play's", async () => {
    const loaded = await load({
      autosave: v4ShareJson,
      playgroundAutosave: v3ShareJson,
    })
    assert.equal(loaded.source, "autosave")
  })

  test("reads /play's autosave when the Scratchpad has none", async () => {
    const loaded = await load({ playgroundAutosave: v4ShareJson })
    assert.equal(loaded.source, "playground-autosave")
  })

  test("after a Reset cleared the autosave, /play's autosave isn't read", async () => {
    const loaded = await load({
      autosave: "cleared",
      playgroundAutosave: v4ShareJson,
    })
    assertSeed(loaded)
  })

  test("a fresh visit opens the seed for the remembered version", async () => {
    assertSeed(await load({ versionPreference: JSON.stringify("v3") }), "v3")
  })

  test("?version picks the seed over the remembered version", async () => {
    assertSeed(
      await load({
        location: { search: "?version=v3" },
        versionPreference: JSON.stringify("v4"),
      }),
      "v3",
    )
  })
})
