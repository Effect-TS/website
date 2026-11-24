import * as Effect from "effect/Effect"
import { toFlatWorkspace, type FlatWorkspace } from "@/features/share/flat"
import { patchScratchpadTsConfig } from "@/features/share/tsconfig"
import {
  effectVersionOf,
  type EffectVersion,
  makeDefaultWorkspace,
  type Workspace,
} from "@/features/share/workspace"

/**
 * The Playground v4 template imports `NodeSocket` from the package root,
 * which loads every platform-node module at startup. The Scratchpad imports
 * the one module it needs.
 */
export const SCRATCHPAD_SEED_DEVTOOLS = `import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as DevTools from "effect/devtools/DevTools"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"

export const DevToolsLayer = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 })),
  Layer.provideMerge(Logger.layer([Logger.consolePretty(), Logger.tracerLogger]))
)
`

/**
 * The v3 template imports `DevTools` and `NodeSocket` from the package roots,
 * which load every module of both packages at startup. The Scratchpad imports
 * the two modules it needs.
 */
export const SCRATCHPAD_SEED_DEVTOOLS_V3 = `import * as DevTools from "@effect/experimental/DevTools"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import { Layer } from "effect"

export const DevToolsLayer = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 }))
)
`

const seedDevTools: Record<EffectVersion, string> = {
  v3: SCRATCHPAD_SEED_DEVTOOLS_V3,
  v4: SCRATCHPAD_SEED_DEVTOOLS,
}

/** The Container runs Node 24, so its types match `@types/node@^24`. */
const SEED_TYPES_NODE_RANGE = "^24"

/**
 * tsrs runs the Effect language service built in, so this entry only matters
 * to editors outside the Scratchpad (a downloaded zip). v3 seeds list it, as
 * the v3 docs tell people to.
 */
const seedExtraDependencies: Record<EffectVersion, Record<string, string>> = {
  v3: { "@effect/language-service": "latest" },
  v4: {},
}

const patchSeedPackageJson = (
  content: string,
  version: EffectVersion,
): string => {
  const pkg = JSON.parse(content) as {
    readonly dependencies?: Record<string, string>
  }
  // The Playground template's `typescript` is for /play's runner. Here tsrs
  // type-checks in the web worker and Node runs the TypeScript, so installing
  // it (24 MB) buys nothing.
  const { typescript: _typescript, ...dependencies } = pkg.dependencies ?? {}
  return JSON.stringify(
    {
      ...pkg,
      dependencies: {
        ...dependencies,
        ...seedExtraDependencies[version],
        "@types/node": SEED_TYPES_NODE_RANGE,
      },
    },
    undefined,
    2,
  )
}

const patchSeedFile = (
  path: string,
  content: string,
  version: EffectVersion,
): string => {
  switch (path) {
    case "tsconfig.json":
      return patchScratchpadTsConfig(content) ?? content
    case "package.json":
      return patchSeedPackageJson(content, version)
    case "src/DevTools.ts":
      return seedDevTools[version]
    default:
      return content
  }
}

/**
 * The Scratchpad seed for an Effect version, in the share format: the
 * Playground template for that version with the language-service plugin and
 * `verbatimModuleSyntax` in `tsconfig.json`, `src/DevTools.ts` importing only
 * the modules it uses, `@types/node` pinned to the Container's Node major,
 * and no `typescript`. Every other dependency keeps the template's range.
 */
export const makeScratchpadSeedWorkspace = (
  version: EffectVersion = "v4",
): Workspace =>
  Effect.runSync(
    makeDefaultWorkspace(version).updateFiles((file, path) => {
      const content = patchSeedFile(path, file.initialContent, version)
      return Effect.succeed(
        content === file.initialContent ? file : file.withContent(content),
      )
    }),
  )

/**
 * Each version's seed as a flat file map, with the share-format metadata
 * (name, shells, initial file) a Share of an unchanged seed writes back.
 */
export const SCRATCHPAD_SEEDS: Readonly<Record<EffectVersion, FlatWorkspace>> =
  {
    v3: toFlatWorkspace(makeScratchpadSeedWorkspace("v3")),
    v4: toFlatWorkspace(makeScratchpadSeedWorkspace("v4")),
  }

export const scratchpadSeed = (version: EffectVersion): FlatWorkspace =>
  SCRATCHPAD_SEEDS[version]

/** The v4 seed, the default when nothing picks a version. */
export const SCRATCHPAD_SEED: FlatWorkspace = SCRATCHPAD_SEEDS.v4

export const SCRATCHPAD_SEED_FILES: Readonly<Record<string, string>> =
  SCRATCHPAD_SEED.files

/**
 * The Effect version a Workspace targets, read from its `package.json` the
 * way `/play` reads it. A missing or unparsable `package.json` counts as v4,
 * the Scratchpad's default.
 */
export const effectVersionOfFiles = (
  files: Readonly<Record<string, string>>,
): EffectVersion => {
  const content = files["package.json"]
  if (content === undefined) {
    return "v4"
  }
  try {
    const pkg: unknown = JSON.parse(content)
    const dependencies =
      typeof pkg === "object" && pkg !== null && "dependencies" in pkg
        ? pkg.dependencies
        : undefined
    return typeof dependencies === "object" && dependencies !== null
      ? effectVersionOf(dependencies as Record<string, string>)
      : "v4"
  } catch {
    return "v4"
  }
}
