import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import {
  effectVersionForCodeLink,
  isStaleWorkspaceHandle,
  makeDefaultWorkspace,
  makeFile,
} from "../../../src/features/playground/domain/workspace.ts"

test("recognizes documented v4 dist-tags", () => {
  const workspace = makeDefaultWorkspace("v3")
  const [packageJson] = workspace
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  const nextWorkspace = workspace.replaceNode(
    packageJson,
    makeFile(
      "package.json",
      JSON.stringify({ dependencies: { effect: "next" } }),
      false,
    ),
  )

  assert.equal(nextWorkspace.effectVersion, "v4")
})

test("keeps legacy unversioned code links on v3", () => {
  assert.equal(effectVersionForCodeLink(undefined), "v3")
  assert.equal(effectVersionForCodeLink("v4"), "v4")
})

test("autosave staleness follows the handle's initial version", () => {
  assert.equal(isStaleWorkspaceHandle("v4", "v3"), true)
  assert.equal(isStaleWorkspaceHandle("v4", "v4"), false)
  assert.equal(isStaleWorkspaceHandle(undefined, "v3"), false)
})
