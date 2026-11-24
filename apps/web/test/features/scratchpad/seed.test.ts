import * as Option from "effect/Option"
import { assert, describe, test } from "vite-plus/test"
import {
  effectVersionOfFiles,
  SCRATCHPAD_SEED_FILES,
  SCRATCHPAD_SEEDS,
} from "../../../src/features/scratchpad/seed.ts"
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

describe("Scratchpad v3 seed", () => {
  const v3 = SCRATCHPAD_SEEDS.v3.files
  const v3Template = makeDefaultWorkspace("v3")

  test("has the same files as the v4 seed, with the v3 template's main.ts", () => {
    assert.deepStrictEqual(
      Object.keys(v3).sort(),
      Object.keys(SCRATCHPAD_SEED_FILES).sort(),
    )
    assert.equal(
      v3["src/main.ts"],
      Option.getOrThrow(v3Template.findFile("src/main.ts"))[0].initialContent,
    )
  })

  test("depends on Effect v3 and the language service, with @types/node ^24", () => {
    const pkg = JSON.parse(v3["package.json"]!)
    assert.match(pkg.dependencies.effect, /^\^3\./)
    assert.property(pkg.dependencies, "@effect/language-service")
    assert.equal(pkg.dependencies["@types/node"], "^24")
  })

  test("tsconfig.json gets the language-service plugin and verbatimModuleSyntax", () => {
    const tsconfig = JSON.parse(v3["tsconfig.json"]!)
    assert.deepStrictEqual(
      tsconfig.compilerOptions.plugins,
      JSON.parse(SCRATCHPAD_SEED_FILES["tsconfig.json"]!).compilerOptions
        .plugins,
    )
    assert.isTrue(tsconfig.compilerOptions.verbatimModuleSyntax)
  })

  test("DevTools.ts imports each module directly", () => {
    assert.include(v3["src/DevTools.ts"]!, '"@effect/experimental/DevTools"')
    assert.include(v3["src/DevTools.ts"]!, '"@effect/platform-node/NodeSocket"')
  })
})

describe("effectVersionOfFiles", () => {
  const withDeps = (dependencies: Record<string, string>) => ({
    "package.json": JSON.stringify({ dependencies }),
  })

  test("reads each seed's version", () => {
    assert.equal(effectVersionOfFiles(SCRATCHPAD_SEEDS.v3.files), "v3")
    assert.equal(effectVersionOfFiles(SCRATCHPAD_SEEDS.v4.files), "v4")
  })

  test("reads exact versions the Container's install writes back", () => {
    assert.equal(effectVersionOfFiles(withDeps({ effect: "3.22.2" })), "v3")
    assert.equal(effectVersionOfFiles(withDeps({ effect: "4.1.5" })), "v4")
  })

  test("latest is v3 only beside the old v3 packages", () => {
    assert.equal(
      effectVersionOfFiles(
        withDeps({ effect: "latest", "@effect/platform": "latest" }),
      ),
      "v3",
    )
    assert.equal(effectVersionOfFiles(withDeps({ effect: "latest" })), "v4")
  })

  test("a missing or broken package.json counts as v4", () => {
    assert.equal(effectVersionOfFiles({}), "v4")
    assert.equal(effectVersionOfFiles({ "package.json": "{" }), "v4")
  })
})
