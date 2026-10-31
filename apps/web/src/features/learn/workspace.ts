import starter from "../../../../../courses/rulebook/package.json"
import {
  makeDirectory,
  makeFile,
  Workspace,
  WorkspaceShell,
} from "../playground/domain/workspace"

export interface LessonFiles {
  readonly start: string
  readonly solution: string
}

/**
 * The versions every lesson workspace installs, read from the starter in
 * `courses/rulebook/` so the browser track cannot drift from the local one.
 * The playground's default v4 workspace follows `latest`, which would.
 */
const lessonDependencies: Readonly<Record<string, string>> = {
  "@effect/platform-node": starter.dependencies["@effect/platform-node"],
  "@types/node": starter.devDependencies["@types/node"],
  effect: starter.dependencies.effect,
  typescript: starter.devDependencies.typescript,
}

/**
 * Builds the playground workspace for a Part 1 lesson: the start file as
 * `src/main.ts`, or the solution file when `solve` is set. It is the only
 * source file: Part 1 provides no logging or tracing layer. The lesson 8
 * solution fails to typecheck on purpose; that error is the lesson.
 */
export function makeLessonWorkspace(
  lesson: LessonFiles,
  options?: { readonly solve?: boolean },
): Workspace {
  const main = options?.solve ? lesson.solution : lesson.start
  return Workspace.new({
    name: "learn",
    dependencies: lessonDependencies,
    shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
    initialFilePath: "src/main.ts",
    tree: [makeDirectory("src", [makeFile("main.ts", main)])],
  })
}
