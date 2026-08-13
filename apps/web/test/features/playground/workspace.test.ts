import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import {
  makeDefaultWorkspace,
  makeFile,
} from "../../../src/features/playground/domain/workspace.ts"

test("recognizes published v4 dist-tags", () => {
  for (const version of ["rc", "beta"]) {
    assert.equal(workspaceWithEffectVersion(version).effectVersion, "v4")
  }
})

test("does not classify unpublished or v3 tags as v4", () => {
  assert.equal(workspaceWithEffectVersion("next").effectVersion, "v3")
  assert.equal(workspaceWithEffectVersion("latest").effectVersion, "v3")
})

function workspaceWithEffectVersion(version: string) {
  const workspace = makeDefaultWorkspace("v3")
  const [packageJson] = workspace
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  return workspace.replaceNode(
    packageJson,
    makeFile(
      "package.json",
      JSON.stringify({ dependencies: { effect: version } }),
      false,
    ),
  )
}
