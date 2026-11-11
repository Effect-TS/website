import { describe, expect, test } from "vite-plus/test"
import {
  buildOutline,
  goalsOf,
  lessonFile,
  lessonToMarkdown,
  llmsIndex,
  slugForId,
  type Lesson,
} from "../../../src/features/tutorial/model.ts"

const raw = {
  "/src/content/tutorial/01-errors/01-failing/main.ts": "start",
}

const lesson: Lesson = {
  id: "01-errors/01-failing/index",
  slug: "errors/failing",
  chapter: "errors",
  chapterTitle: "Errors",
  title: "Failing",
  prose: "Make it fail.\n",
  main: "start\n",
  solution: "answer\n",
  test: "check\n",
}

describe("tutorial model", () => {
  test("slugForId drops order prefixes and index", () => {
    expect(slugForId("01-errors/01-failing/index")).toBe("errors/failing")
  })

  test("lessonFile reads a file and fails when missing", () => {
    expect(lessonFile(raw, "01-errors/01-failing/index", "main.ts")).toBe(
      "start",
    )
    expect(() =>
      lessonFile(raw, "01-errors/01-failing/index", "solution.ts"),
    ).toThrow("missing solution.ts")
  })

  test("lessonToMarkdown has start, goal test, solution", () => {
    const md = lessonToMarkdown(lesson)
    expect(md).toContain('### Start\n\n```ts title="main.ts"\nstart\n```')
    expect(md).toContain(
      '### Goal test\n\n```ts title="main.test.ts"\ncheck\n```',
    )
    expect(md).toContain('### Solution\n\n```ts title="main.ts"\nanswer\n```')
  })

  test("llmsIndex links lessons", () => {
    expect(llmsIndex([lesson])).toContain(
      "- [Failing](/tutorial/errors/failing.md)",
    )
  })

  test("buildOutline groups lessons by chapter in order", () => {
    const other: Lesson = { ...lesson, slug: "errors/next", title: "Next" }
    const third: Lesson = {
      ...lesson,
      slug: "layers/first",
      chapter: "layers",
      chapterTitle: "Layers",
      title: "First",
    }
    expect(buildOutline([lesson, other, third])).toEqual([
      {
        slug: "errors",
        title: "Errors",
        lessons: [
          { slug: "errors/failing", title: "Failing" },
          { slug: "errors/next", title: "Next" },
        ],
      },
      {
        slug: "layers",
        title: "Layers",
        lessons: [{ slug: "layers/first", title: "First" }],
      },
    ])
  })

  test("goalsOf lists the it() names of a goal test", () => {
    expect(
      goalsOf(
        "it(\"fails with NotFound\", () => {})\nit('second', async () => {})",
      ),
    ).toEqual(["fails with NotFound", "second"])
  })
})
