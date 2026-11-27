import * as Option from "effect/Option"
import { assert, describe, test } from "vite-plus/test"
import {
  effectVersionOfFiles,
  SCRATCHPAD_SEEDS,
} from "../../../src/features/scratchpad/seed.ts"
import { makeDefaultWorkspace } from "../../../src/features/share/workspace.ts"

describe("Scratchpad seed", () => {
  test("each version's seed opens that version's Playground main.ts", () => {
    for (const version of ["v3", "v4"] as const) {
      const template = makeDefaultWorkspace(version)
      assert.equal(
        SCRATCHPAD_SEEDS[version].files["src/main.ts"],
        Option.getOrThrow(template.findFile("src/main.ts"))[0].initialContent,
      )
    }
  })

  test("no seed installs typescript", () => {
    for (const seed of Object.values(SCRATCHPAD_SEEDS)) {
      const pkg = JSON.parse(seed.files["package.json"]!)
      assert.notProperty(pkg.dependencies, "typescript")
    }
  })
})

describe("effectVersionOfFiles", () => {
  const withDeps = (dependencies: Record<string, string>) => ({
    "package.json": JSON.stringify({ dependencies }),
  })

  test("reads the exact v3 version an install writes back as v3", () => {
    assert.equal(effectVersionOfFiles(withDeps({ effect: "3.22.2" })), "v3")
  })

  test("latest is v3 only beside the v3-era @effect/platform", () => {
    assert.equal(
      effectVersionOfFiles(
        withDeps({ effect: "latest", "@effect/platform": "latest" }),
      ),
      "v3",
    )
    assert.equal(effectVersionOfFiles(withDeps({ effect: "latest" })), "v4")
  })

  test("a broken package.json counts as v4", () => {
    assert.equal(effectVersionOfFiles({ "package.json": "{" }), "v4")
  })
})
