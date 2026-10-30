import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

const here = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(here, "../../..")
const contentRoot = path.join(webRoot, "src/content/tutorial")
const testApi = path.join(webRoot, "src/features/tutorial/runner/test-api.ts")
const scratch = path.join(webRoot, "test/.tmp-lessons")

const lessonDirs = fs
  .readdirSync(contentRoot)
  .flatMap((chapter) =>
    fs
      .readdirSync(path.join(contentRoot, chapter))
      .map((lesson) => path.join(chapter, lesson)),
  )

const mount = (lesson: string, variant: "start" | "solution") => {
  const dir = path.join(
    scratch,
    `${lesson.replaceAll(path.sep, "-")}-${variant}`,
  )
  fs.mkdirSync(dir, { recursive: true })
  const source = path.join(contentRoot, lesson)
  fs.copyFileSync(
    path.join(source, variant === "start" ? "main.ts" : "solution.ts"),
    path.join(dir, "main.ts"),
  )
  fs.copyFileSync(
    path.join(source, "main.test.ts"),
    path.join(dir, "main.test.ts"),
  )
  return dir
}

const diagnostics = (dir: string) => {
  const files = ["main.ts", "main.test.ts"].map((file) => path.join(dir, file))
  const program = ts.createProgram(files, {
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    paths: { "tutorial-test": [testApi] },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  })
  const of = (file: string) =>
    ts
      .getPreEmitDiagnostics(program, program.getSourceFile(file))
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      )
  return { main: of(files[0]!), test: of(files[1]!) }
}

const runGoalTest = async (dir: string) => {
  vi.resetModules()
  await import(/* @vite-ignore */ path.join(dir, "main.test.ts"))
  const api = await import("../../../src/features/tutorial/runner/test-api.ts")
  return api.runTests()
}

afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }))

describe.each(lessonDirs)("lesson %s", (lesson) => {
  test("the solution type-checks and reaches the goal", async () => {
    const dir = mount(lesson, "solution")
    expect(diagnostics(dir)).toEqual({ main: [], test: [] })
    const results = await runGoalTest(dir)
    expect(results.length).toBeGreaterThan(0)
    expect(results.filter((result) => !result.ok)).toEqual([])
  })

  test("the start file type-checks but does not reach the goal", async () => {
    const dir = mount(lesson, "start")
    const found = diagnostics(dir)
    expect(found.main).toEqual([])
    if (found.test.length > 0) return
    const results = await runGoalTest(dir)
    expect(results.some((result) => !result.ok)).toBe(true)
  })
})
