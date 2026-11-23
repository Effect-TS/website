import * as Option from "effect/Option"
import { assert, describe, test } from "vite-plus/test"
import {
  SCRATCHPAD_SEED,
  SCRATCHPAD_SEED_FILES,
} from "../../../src/features/scratchpad/seed.ts"
import { fromFlatWorkspace } from "../../../src/features/share/flat.ts"
import { makeDefaultWorkspace } from "../../../src/features/share/workspace.ts"

const template = makeDefaultWorkspace("v4")
const templateFile = (path: string) =>
  Option.getOrThrow(template.findFile(path))[0].initialContent

describe("Scratchpad seed", () => {
  test("has the Playground v4 template's files", () => {
    assert.deepStrictEqual(Object.keys(SCRATCHPAD_SEED_FILES).sort(), [
      "dprint.json",
      "package.json",
      "src/DevTools.ts",
      "src/main.ts",
      "tsconfig.json",
    ])
    assert.equal(
      SCRATCHPAD_SEED_FILES["src/main.ts"],
      templateFile("src/main.ts"),
    )
    assert.equal(
      SCRATCHPAD_SEED_FILES["dprint.json"],
      templateFile("dprint.json"),
    )
  })

  test("tsconfig.json gets the language-service plugin and verbatimModuleSyntax", () => {
    const tsconfig = JSON.parse(SCRATCHPAD_SEED_FILES["tsconfig.json"]!)
    assert.deepStrictEqual(tsconfig.compilerOptions.plugins, [
      {
        name: "@effect/language-service",
        diagnosticSeverity: { unstableApiUsage: "off" },
      },
    ])
    assert.isTrue(tsconfig.compilerOptions.verbatimModuleSyntax)
    assert.equal(tsconfig.compilerOptions.module, "NodeNext")
  })

  test("pins @types/node to ^24 and keeps the other ranges", () => {
    const pkg = JSON.parse(SCRATCHPAD_SEED_FILES["package.json"]!)
    const templatePkg = JSON.parse(templateFile("package.json"))
    assert.deepStrictEqual(pkg, {
      ...templatePkg,
      dependencies: { ...templatePkg.dependencies, "@types/node": "^24" },
    })
    assert.equal(pkg.dependencies.effect, "latest")
    assert.equal(pkg.dependencies["@effect/platform-node"], "latest")
  })

  test("DevTools.ts imports NodeSocket from its own module", () => {
    const devTools = SCRATCHPAD_SEED_FILES["src/DevTools.ts"]!
    assert.include(
      devTools,
      'import * as NodeSocket from "@effect/platform-node/NodeSocket"',
    )
    assert.notInclude(devTools, 'from "@effect/platform-node"')
    assert.include(devTools, "NodeSocket.layerNet({ port: 34437 })")
  })

  test("leaves the Playground's own v4 template alone", () => {
    assert.include(
      templateFile("src/DevTools.ts"),
      'from "@effect/platform-node"',
    )
    assert.notInclude(templateFile("tsconfig.json"), "verbatimModuleSyntax")
  })

  test("round-trips to a v4 share-format Workspace", () => {
    const workspace = fromFlatWorkspace(SCRATCHPAD_SEED)
    assert.equal(workspace.effectVersion, "v4")
    assert.equal(workspace.initialFilePath, "src/main.ts")
    assert.equal(workspace.name, template.name)
  })
})
