import { assert, test } from "vite-plus/test"
import { lessonRoutes } from "../../../src/features/learn/routes.ts"

const lesson = (id: string, part: number, order: number) => ({
  id,
  data: { part, order, title: id, minutes: 10, mode: "local" as const },
})

const entries = [
  lesson("first-tests", 2, 13),
  lesson("provide-it", 1, 9),
  lesson("your-program", 2, 1),
  lesson("a-place-for-rules", 1, 8),
]

test("orders lessons by part then order with part-N/NN-slug slugs", () => {
  assert.deepEqual(
    lessonRoutes(entries).map((route) => route.slug),
    [
      "part-1/08-a-place-for-rules",
      "part-1/09-provide-it",
      "part-2/01-your-program",
      "part-2/13-first-tests",
    ],
  )
})

test("prev and next cross part boundaries", () => {
  const [, endOfPart1, startOfPart2] = lessonRoutes(entries)

  assert.equal(endOfPart1.next, "part-2/01-your-program")
  assert.equal(startOfPart2.prev, "part-1/09-provide-it")
})

test("guides come before the lesson of the same order, by id, with unnumbered slugs", () => {
  const guide = (id: string) => ({
    id,
    data: { part: 2, order: 11, title: id, mode: "guide" as const },
  })
  const routes = lessonRoutes([
    lesson("first-tests", 2, 13),
    lesson("entrypoint", 2, 11),
    guide("trace-viewer"),
    guide("setup"),
    lesson("checkpoint", 1, 10),
  ])

  assert.deepEqual(
    routes.map((route) => route.slug),
    [
      "part-1/10-checkpoint",
      "part-2/setup",
      "part-2/trace-viewer",
      "part-2/11-entrypoint",
      "part-2/13-first-tests",
    ],
  )
})
