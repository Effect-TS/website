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

test("v4 default workspace provides a pretty logger with colors enabled", () => {
  const [logger] = makeDefaultWorkspace("v4")
    .findFile("src/Logger.ts")
    .pipe(Option.getOrThrow)
  assert.include(
    logger.initialContent,
    "Logger.consolePretty({ colors: true })",
  )
  assert.include(logger.initialContent, "Logger.layer(")
  // Logger.layer overwrites the default logger set, which includes
  // tracerLogger; dropping it removes span events from the DevTools trace.
  assert.include(logger.initialContent, "Logger.tracerLogger")
})

test("v4 default main provides the logger layer", () => {
  const [main] = makeDefaultWorkspace("v4")
    .findFile("src/main.ts")
    .pipe(Option.getOrThrow)
  assert.include(main.initialContent, 'import { LoggerLive } from "./Logger"')
  assert.include(
    main.initialContent,
    "Effect.provide([DevToolsLayer, LoggerLive])",
  )
})

test("v3 default workspace does not ship a logger layer", () => {
  const workspace = makeDefaultWorkspace("v3")
  assert.isTrue(Option.isNone(workspace.findFile("src/Logger.ts")))
  const [main] = workspace.findFile("src/main.ts").pipe(Option.getOrThrow)
  assert.notInclude(main.initialContent, "LoggerLive")
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
