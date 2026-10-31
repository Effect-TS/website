/// <reference types="vite/client" />
import type { LessonFiles } from "./workspace"

const root = "../../../../../courses/reflex/"

/**
 * The starter's lesson, checkpoint and fixture files, read at build time so
 * lesson prose renders the same files learners run and CI checks.
 */
const sources = import.meta.glob<string>(
  [
    "../../../../../courses/reflex/lessons/part1/**/*.ts",
    "../../../../../courses/reflex/checkpoints/**/*.{ts,sql,json,txt}",
    "../../../../../courses/reflex/fixtures/**/*.json",
    "!../../../../../courses/reflex/lessons/part1/test/**",
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
 * Reads a file by its path in `courses/reflex/`, e.g.
 * `lessons/part1/02-describe-then-run/solution/main.ts`.
 */
export function courseFile(path: string): string {
  const content = courseFiles.get(path)
  if (content === undefined) {
    throw new Error(`courses/reflex/${path} does not exist`)
  }
  return content
}

/**
 * One top-level declaration from a course file, exactly as written there: the
 * column-0 line that declares `name`, then the indented or closing lines after
 * it, blank lines between them included, up to the next column-0 statement.
 * This relies on the course files being dprint-formatted, which CI checks.
 */
export function courseDeclaration(path: string, name: string): string {
  const lines = courseFile(path).split("\n")
  const declares = new RegExp(
    `^(?:export )?(?:class|const|interface|type|function) ${name}\\b`,
  )
  const start = lines.findIndex((line) => declares.test(line))
  if (start === -1) {
    throw new Error(`courses/reflex/${path} does not declare ${name}`)
  }
  let end = start
  for (let line = start + 1; line < lines.length; line++) {
    const text = lines[line]!
    if (text.trim() === "") continue
    if (!/^(?:\s+\S|[})\]])/.test(text)) break
    end = line
  }
  return lines.slice(start, end + 1).join("\n")
}

/**
 * Lesson 1 has no exercise, only a solution, so it also starts there.
 */
export function lessonFiles(lessonDir: string): LessonFiles {
  const solution = courseFile(`lessons/part1/${lessonDir}/solution/main.ts`)
  const start = courseFiles.get(`lessons/part1/${lessonDir}/start/main.ts`)
  return { start: start ?? solution, solution }
}
