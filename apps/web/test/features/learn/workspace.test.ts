import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import { makeLessonWorkspace } from "../../../src/features/learn/workspace.ts"
import { makeDefaultWorkspace } from "../../../src/features/playground/domain/workspace.ts"

const lesson = {
  start: `// start\n`,
  solution: `// solution\n`,
}

const exactVersion = /^\d+\.\d+\.\d+$/

test("pins every dependency to an exact version", () => {
  const workspace = makeLessonWorkspace(lesson)
  const dependencies = workspace.dependencies

  assert.deepEqual(Object.keys(dependencies).sort(), [
    "@effect/platform-node",
    "@types/node",
    "effect",
    "typescript",
  ])
  assert.equal(dependencies["effect"], "4.1.1")
  assert.equal(dependencies["@effect/platform-node"], "4.1.1")
  assert.match(dependencies["@types/node"], exactVersion)
  assert.match(dependencies["typescript"], exactVersion)
  assert.notInclude(workspace.prepare, "latest")
  assert.equal(workspace.effectVersion, "v4")
})

test("holds the lesson start file beside the playground's v4 DevTools", () => {
  const workspace = makeLessonWorkspace(lesson)
  const [devTools] = makeDefaultWorkspace("v4")
    .findFile("src/DevTools.ts")
    .pipe(Option.getOrThrow)

  assert.equal(contentOf(workspace, "src/main.ts"), lesson.start)
  assert.equal(contentOf(workspace, "src/DevTools.ts"), devTools.initialContent)
})

test("the solve variant swaps in the solution file", () => {
  const workspace = makeLessonWorkspace(lesson, { solve: true })

  assert.equal(contentOf(workspace, "src/main.ts"), lesson.solution)
})

function contentOf(
  workspace: ReturnType<typeof makeLessonWorkspace>,
  path: string,
) {
  return workspace.findFile(path).pipe(Option.getOrThrow)[0].initialContent
}
