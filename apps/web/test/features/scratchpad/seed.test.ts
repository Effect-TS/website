import * as Option from "effect/Option"
import { assert, describe, test } from "vite-plus/test"
import { SCRATCHPAD_SEED_FILES } from "../../../src/features/scratchpad/seed.ts"
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

  test("pins @types/node to ^24 and keeps Effect on latest", () => {
    const pkg = JSON.parse(SCRATCHPAD_SEED_FILES["package.json"]!)
    assert.equal(pkg.dependencies["@types/node"], "^24")
    assert.equal(pkg.dependencies.effect, "latest")
    assert.equal(pkg.dependencies["@effect/platform-node"], "latest")
  })

  test("DevTools.ts imports NodeSocket from its own module", () => {
    assert.include(
      SCRATCHPAD_SEED_FILES["src/DevTools.ts"]!,
      'import * as NodeSocket from "@effect/platform-node/NodeSocket"',
    )
  })
})
