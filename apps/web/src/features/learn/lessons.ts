/// <reference types="vite/client" />
import type { LessonFiles } from "./workspace"

const root = "../../../../../courses/rulebook/"

/**
 * The starter's lesson and checkpoint files, read at build time so lesson
 * prose renders the same files learners run and CI checks.
 */
const sources = import.meta.glob<string>(
  [
    "../../../../../courses/rulebook/lessons/part1/**/*.ts",
    "../../../../../courses/rulebook/checkpoints/**/*.{ts,sql,json}",
    "!../../../../../courses/rulebook/lessons/part1/test/**",
  ],
  { query: "?raw", import: "default", eager: true },
)

const courseFiles = new Map(
  Object.entries(sources).map(([path, content]) => [
    path.slice(root.length),
    content,
  ]),
)

/**
 * Reads a file by its path in `courses/rulebook/`, e.g.
 * `lessons/part1/02-describe-then-run/solution/main.ts`.
 */
export function courseFile(path: string): string {
  const content = courseFiles.get(path)
  if (content === undefined) {
    throw new Error(`courses/rulebook/${path} does not exist`)
  }
  return content
}

/**
 * Lesson 1 has no exercise, only a solution, so it also starts there.
 */
export function lessonFiles(lessonDir: string): LessonFiles {
  const solution = courseFile(`lessons/part1/${lessonDir}/solution/main.ts`)
  const start = courseFiles.get(`lessons/part1/${lessonDir}/start/main.ts`)
  return { start: start ?? solution, solution }
}
