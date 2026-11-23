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
import { SCRATCHPAD_SEED } from "../../../src/features/scratchpad/seed.ts"
import {
  Compression,
  WorkspaceCompression,
} from "../../../src/features/share/compression.ts"
import { fromFlatWorkspace } from "../../../src/features/share/flat.ts"
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
  readonly autosave?: unknown
  readonly playgroundAutosave?: unknown
}

const AutosaveSchema = Schema.Option(Workspace)

const load = (fixture: Fixture): Promise<LoadedScratchpadWorkspace> => {
  const retrieved: Array<string> = []
  const shortener = Layer.succeed(ShortenClient, {
    retrieve: ({ params }: { readonly params: { readonly hash: string } }) => {
      retrieved.push(params.hash)
      return Effect.succeed(Option.fromNullishOr(fixture.shares?.[params.hash]))
    },
  } as unknown as ShortenClient["Service"])
  return Effect.gen(function* () {
    const store = KeyValueStore.toSchemaStore(
      yield* KeyValueStore.KeyValueStore,
      AutosaveSchema,
    )
    if (fixture.autosave !== undefined) {
      yield* store.set(
        SCRATCHPAD_AUTOSAVE_KEY,
        Option.some(decodeWorkspace(fixture.autosave)),
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

const assertSeed = (loaded: LoadedScratchpadWorkspace) => {
  assert.equal(loaded.source, "seed")
  assert.deepStrictEqual(loaded.files, SCRATCHPAD_SEED.files)
  assert.deepStrictEqual(loaded.metadata, SCRATCHPAD_SEED.metadata)
  assert.equal(loaded.initialFilePath, "src/main.ts")
}

describe("loadScratchpadWorkspace", () => {
  test("loads the seed when there's nothing else", async () => {
    const loaded = await load({})
    assertSeed(loaded)
    assert.isTrue(Option.isNone(loaded.notice))
  })

  test("loads a v4 share from the hash, normalized for the Scratchpad", async () => {
    const loaded = await load({
      location: { hash: "#v4share" },
      shares: { v4share: await compressJson(v4ShareJson) },
    })
    assert.equal(loaded.source, "hash")
    assert.isTrue(Option.isNone(loaded.notice))
    assert.deepStrictEqual(Object.keys(loaded.files).sort(), [
      "dprint.json",
      "package.json",
      "src/Program.ts",
      "src/main.ts",
      "tsconfig.json",
    ])
    // normalizeWorkspace's legacy repairs.
    assert.include(loaded.files["src/main.ts"], 'from "./Program.js"')
    // The Scratchpad's tsconfig patch.
    const tsconfig = JSON.parse(loaded.files["tsconfig.json"]!)
    assert.deepStrictEqual(tsconfig.compilerOptions.plugins, [
      {
        name: "@effect/language-service",
        diagnosticSeverity: { unstableApiUsage: "off" },
      },
    ])
    assert.isTrue(tsconfig.compilerOptions.verbatimModuleSyntax)
    // The share's own pins survive.
    assert.equal(
      JSON.parse(loaded.files["package.json"]!).dependencies.effect,
      "4.0.0-beta.5",
    )
    // initialFilePath opens first.
    assert.equal(loaded.initialFilePath, "src/Program.ts")
  })

  test("keeps the share metadata for a later Share", async () => {
    const loaded = await load({
      location: { hash: "v4share" },
      shares: { v4share: await compressJson(v4ShareJson) },
    })
    const metadata = loaded.metadata!
    assert.equal(metadata.name, "playground-v4")
    assert.equal(metadata.initialFilePath, "src/Program.ts")
    assert.equal(metadata.prepare, "pnpm install")
    assert.deepStrictEqual(
      metadata.shells.map((shell) => shell.command),
      ["../run src/main.ts"],
    )
    assert.deepStrictEqual(
      metadata.nodes.find((node) => node.path === "src/Program.ts"),
      {
        _tag: "File",
        path: "src/Program.ts",
        language: "typescript",
        userManaged: true,
      },
    )
    const rebuilt = fromFlatWorkspace({
      files: loaded.files,
      directories: [],
      metadata,
    })
    assert.equal(rebuilt.name, "playground-v4")
    assert.equal(rebuilt.initialFilePath, "src/Program.ts")
    assert.equal(rebuilt.effectVersion, "v4")
  })

  test("a v3 share loads the seed with a notice linking to the same hash", async () => {
    const loaded = await load({
      location: { hash: "#v3share" },
      shares: { v3share: await compressJson(v3ShareJson) },
      autosave: v4ShareJson,
    })
    assertSeed(loaded)
    const notice = Option.getOrThrow(loaded.notice)
    assert.equal(notice.reason, "v3")
    assert.equal(notice.source, "hash")
    assert.equal(notice.playgroundUrl, "/play#v3share")
    assert.include(notice.message, "Effect v3")
  })

  test("an over-limit share loads the seed with a limits notice", async () => {
    const loaded = await load({
      location: { hash: "#big" },
      shares: { big: await compressJson(overLimitShareJson) },
    })
    assertSeed(loaded)
    const notice = Option.getOrThrow(loaded.notice)
    assert.equal(notice.reason, "limits")
    assert.equal(notice.playgroundUrl, "/play#big")
    assert.include(notice.message, "50 files")
  })

  test("a share with a file over 256 KiB gets the limits notice", async () => {
    const huge = structuredClone(v4ShareJson)
    huge.tree[2]!.children![1]!.initialContent = "x".repeat(300 * 1024)
    const loaded = await load({
      location: { hash: "#huge" },
      shares: { huge: await compressJson(huge) },
    })
    assert.equal(Option.getOrThrow(loaded.notice).reason, "limits")
  })

  test("a corrupt hash falls through to the next source", async () => {
    const code = 'import * as Effect from "effect/Effect"\n'
    const loaded = await load({
      location: {
        hash: "#corrupt",
        search: `?code=${encodeCode(code)}&version=v4`,
      },
      shares: { corrupt: "not compressed!" },
    })
    assert.equal(loaded.source, "code")
    assert.equal(loaded.files["src/main.ts"], code)
  })

  test("an unknown hash falls through to the autosave", async () => {
    const loaded = await load({
      location: { hash: "#missing" },
      autosave: v4ShareJson,
    })
    assert.equal(loaded.source, "autosave")
    assert.isTrue(Option.isNone(loaded.notice))
  })

  test("the hash wins over ?code", async () => {
    const loaded = await load({
      location: {
        hash: "#v4share",
        search: `?code=${encodeCode("x")}&version=v4`,
      },
      shares: { v4share: await compressJson(v4ShareJson) },
    })
    assert.equal(loaded.source, "hash")
  })

  test("a ?code link with version=v4 swaps main.ts into the seed", async () => {
    const code =
      'import * as Effect from "effect/Effect"\nEffect.runFork(Effect.log("hi"))\n'
    const loaded = await load({
      location: { search: `?code=${encodeCode(code)}&version=v4` },
      autosave: v4ShareJson,
    })
    assert.equal(loaded.source, "code")
    assert.isTrue(Option.isNone(loaded.notice))
    assert.deepStrictEqual(loaded.files, {
      ...SCRATCHPAD_SEED.files,
      "src/main.ts": code,
    })
    assert.deepStrictEqual(loaded.metadata, SCRATCHPAD_SEED.metadata)
    assert.equal(loaded.initialFilePath, "src/main.ts")
  })

  test("a ?code link without a version is v3, like on /play", async () => {
    const search = `?code=${encodeCode('import { Effect } from "effect"\n')}`
    const loaded = await load({ location: { search } })
    assertSeed(loaded)
    const notice = Option.getOrThrow(loaded.notice)
    assert.equal(notice.reason, "v3")
    assert.equal(notice.source, "code")
    assert.equal(notice.playgroundUrl, `/play${search}`)
  })

  test("a ?code link with version=v3 gets the notice", async () => {
    const search = `?code=${encodeCode("x")}&version=v3`
    const loaded = await load({ location: { search } })
    assert.equal(
      Option.getOrThrow(loaded.notice).playgroundUrl,
      `/play${search}`,
    )
  })

  test("an undecodable ?code falls through", async () => {
    const loaded = await load({ location: { search: "?code=%%%" } })
    assertSeed(loaded)
    assert.isTrue(Option.isNone(loaded.notice))
  })

  test("the Scratchpad autosave wins over /play's", async () => {
    const loaded = await load({
      autosave: v4ShareJson,
      playgroundAutosave: { ...v4ShareJson, initialFilePath: "src/main.ts" },
    })
    assert.equal(loaded.source, "autosave")
    assert.equal(loaded.initialFilePath, "src/Program.ts")
  })

  test("reads /play's autosave when the Scratchpad has none", async () => {
    const loaded = await load({ playgroundAutosave: v4ShareJson })
    assert.equal(loaded.source, "playground-autosave")
    assert.include(loaded.files["tsconfig.json"], "@effect/language-service")
  })

  test("a v3 /play autosave gets a notice linking to /play", async () => {
    const loaded = await load({ playgroundAutosave: v3ShareJson })
    assertSeed(loaded)
    const notice = Option.getOrThrow(loaded.notice)
    assert.equal(notice.source, "playground-autosave")
    assert.equal(notice.playgroundUrl, "/play")
  })

  test("an initialFilePath missing from the workspace opens src/main.ts", async () => {
    const loaded = await load({
      playgroundAutosave: { ...v4ShareJson, initialFilePath: "src/gone.ts" },
    })
    assert.equal(loaded.initialFilePath, "src/main.ts")
  })
})
