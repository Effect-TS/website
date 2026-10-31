export interface Lesson {
  readonly id: string
  readonly slug: string
  readonly chapter: string
  readonly chapterTitle: string
  readonly title: string
  readonly prose: string
  /** Starting file, mounted in the editor. */
  readonly main: string
  /** Reference answer, shown by the Solve button. */
  readonly solution: string
  /** Hidden goal test, run against the learner's file. */
  readonly test: string
}

export const LESSON_FILES = {
  main: "main.ts",
  solution: "solution.ts",
  test: "main.test.ts",
} as const

const ORDER_PREFIX = /^\d+-/

export const stripOrderPrefix = (segment: string): string =>
  segment.replace(ORDER_PREFIX, "")

/** `01-errors/01-failing/index` -> `errors/failing` */
export const slugForId = (id: string): string =>
  id
    .replace(/\/index$/, "")
    .split("/")
    .map(stripOrderPrefix)
    .join("/")

/** Reads one file of a lesson from raw glob results, or fails loudly. */
export function lessonFile(
  raw: Readonly<Record<string, string>>,
  lessonId: string,
  file: (typeof LESSON_FILES)[keyof typeof LESSON_FILES],
): string {
  const dir = lessonId.replace(/\/index$/, "")
  const text = raw[`/src/content/tutorial/${dir}/${file}`]
  if (text === undefined) throw new Error(`Lesson ${dir} is missing ${file}`)
  return text
}

const fence = (name: string, text: string): string =>
  `\`\`\`ts title="${name}"\n${text.trimEnd()}\n\`\`\``

/** Plain markdown for AI readers. */
export function lessonToMarkdown(lesson: Lesson): string {
  return (
    [
      `# ${lesson.title}`,
      lesson.prose.trim(),
      `### Start`,
      fence(LESSON_FILES.main, lesson.main),
      `### Goal test`,
      fence(LESSON_FILES.test, lesson.test),
      `### Solution`,
      fence(LESSON_FILES.main, lesson.solution),
    ].join("\n\n") + "\n"
  )
}

const href = (lesson: Lesson): string => `/tutorial/${lesson.slug}`

export function llmsIndex(lessons: ReadonlyArray<Lesson>): string {
  const lines = ["# Effect interactive tutorial", ""]
  let chapter: string | undefined
  for (const lesson of lessons) {
    if (lesson.chapter !== chapter) {
      chapter = lesson.chapter
      lines.push(`## ${lesson.chapterTitle}`, "")
    }
    lines.push(`- [${lesson.title}](${href(lesson)}.md)`)
  }
  return `${lines.join("\n")}\n`
}

export function llmsFull(lessons: ReadonlyArray<Lesson>): string {
  return lessons
    .map((lesson) => `<!-- ${href(lesson)} -->\n\n${lessonToMarkdown(lesson)}`)
    .join("\n")
}

export interface OutlineLesson {
  readonly slug: string
  readonly title: string
}

export interface OutlineChapter {
  readonly slug: string
  readonly title: string
  readonly lessons: ReadonlyArray<OutlineLesson>
}

/** Groups lessons (already in tutorial order) by chapter. */
export function buildOutline(
  lessons: ReadonlyArray<Lesson>,
): ReadonlyArray<OutlineChapter> {
  const chapters: Array<{
    slug: string
    title: string
    lessons: Array<OutlineLesson>
  }> = []
  for (const lesson of lessons) {
    let chapter = chapters.find((item) => item.slug === lesson.chapter)
    if (chapter === undefined) {
      chapter = {
        slug: lesson.chapter,
        title: lesson.chapterTitle,
        lessons: [],
      }
      chapters.push(chapter)
    }
    chapter.lessons.push({ slug: lesson.slug, title: lesson.title })
  }
  return chapters
}

/** Names of the goal test's `it(...)` blocks, in source order. */
export const goalsOf = (test: string): ReadonlyArray<string> =>
  Array.from(
    test.matchAll(/\bit\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g),
    (match) => match[2] ?? "",
  )

/** What the client needs to run a lesson. The prose is served separately. */
export interface LessonCode {
  readonly title: string
  readonly chapter: string
  readonly main: string
  readonly solution: string
  readonly test: string
  readonly goals: ReadonlyArray<string>
}

export const lessonCode = (lesson: Lesson): LessonCode => ({
  title: lesson.title,
  chapter: lesson.chapter,
  main: lesson.main,
  solution: lesson.solution,
  test: lesson.test,
  goals: goalsOf(lesson.test),
})
