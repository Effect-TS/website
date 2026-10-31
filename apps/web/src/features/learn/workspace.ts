import * as Option from "effect/Option"
import starter from "../../../../../courses/rulebook/package.json"
import {
  makeDefaultWorkspace,
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

const [devTools] = makeDefaultWorkspace("v4")
  .findFile("src/DevTools.ts")
  .pipe(Option.getOrThrow)

/**
 * The lesson files import the course's `Telemetry.ts`, which exports to
 * otel-desktop-viewer. In the playground the trace panel plays that role, so
 * `src/Telemetry.ts` hands the lesson the playground's DevTools layer.
 */
const telemetry = makeFile(
  "Telemetry.ts",
  `export { DevToolsLayer as layer } from "./DevTools.js"
`,
)

const telemetryImport = /(["'])(?:\.\.\/)+Telemetry(?:\.[jt]s)?\1/g

function toPlayground(source: string) {
  return source.replace(telemetryImport, `"./Telemetry.js"`)
}

/**
 * Builds the playground workspace for a Part 1 lesson: the start file as
 * `src/main.ts`, or the solution file when `solve` is set. The lesson 8
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
    tree: [
      makeDirectory("src", [
        makeFile("main.ts", toPlayground(main)),
        devTools,
        telemetry,
      ]),
    ],
  })
}
