import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import { makeLessonWorkspace } from "../../../src/features/learn/workspace.ts"

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

// Part 1 provides no layer for logging or tracing, so the lesson file is the
// only source file, exactly as the local track has it.
test("holds only the lesson start file, unchanged, in src", () => {
  const start = `import { NodeRuntime } from "@effect/platform-node"\n`
  const workspace = makeLessonWorkspace({ start, solution: start })
  const sources = [...workspace.filePaths]
    .filter(([node, path]) => node._tag === "File" && path.startsWith("src/"))
    .map(([, path]) => path)

  assert.deepEqual(sources, ["src/main.ts"])
  assert.equal(contentOf(workspace, "src/main.ts"), start)
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
