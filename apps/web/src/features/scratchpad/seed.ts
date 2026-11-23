import * as Effect from "effect/Effect"
import { toFlatWorkspace, type FlatWorkspace } from "@/features/share/flat"
import { patchScratchpadTsConfig } from "@/features/share/tsconfig"
import {
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

/** The Container runs Node 24, so its types match `@types/node@^24`. */
const SEED_TYPES_NODE_RANGE = "^24"

const patchSeedPackageJson = (content: string): string => {
  const pkg = JSON.parse(content) as {
    readonly dependencies?: Record<string, string>
  }
  return JSON.stringify(
    {
      ...pkg,
      dependencies: {
        ...pkg.dependencies,
        "@types/node": SEED_TYPES_NODE_RANGE,
      },
    },
    undefined,
    2,
  )
}

const patchSeedFile = (path: string, content: string): string => {
  switch (path) {
    case "tsconfig.json":
      return patchScratchpadTsConfig(content) ?? content
    case "package.json":
      return patchSeedPackageJson(content)
    case "src/DevTools.ts":
      return SCRATCHPAD_SEED_DEVTOOLS
    default:
      return content
  }
}

/**
 * The Scratchpad seed in the share format: the Playground v4 template with
 * the language-service plugin and `verbatimModuleSyntax` in `tsconfig.json`,
 * `src/DevTools.ts` importing `@effect/platform-node/NodeSocket`, and
 * `@types/node` pinned to the Container's Node major. Every other dependency
 * keeps the template's range.
 */
export const makeScratchpadSeedWorkspace = (): Workspace =>
  Effect.runSync(
    makeDefaultWorkspace("v4").updateFiles((file, path) => {
      const content = patchSeedFile(path, file.initialContent)
      return Effect.succeed(
        content === file.initialContent ? file : file.withContent(content),
      )
    }),
  )

const seedWorkspace = makeScratchpadSeedWorkspace()

/**
 * The seed as a flat file map, with the share-format metadata (name, shells,
 * initial file) a Share of an unchanged seed writes back.
 */
export const SCRATCHPAD_SEED: FlatWorkspace = toFlatWorkspace(seedWorkspace)

export const SCRATCHPAD_SEED_FILES: Readonly<Record<string, string>> =
  SCRATCHPAD_SEED.files
