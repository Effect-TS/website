import { assert, test } from "vite-plus/test"
import { lessonRoutes } from "../../../src/features/learn/routes.ts"

const lesson = (id: string, part: number, order: number) => ({
  id,
  data: { part, order, title: id, minutes: 10, mode: "local" as const },
})

const entries = [
  lesson("first-tests", 2, 13),
  lesson("provide-it", 1, 9),
  lesson("your-program", 2, 11),
  lesson("a-place-for-rules", 1, 8),
]

test("orders lessons by part then order with part-N/NN-slug slugs", () => {
  assert.deepEqual(
    lessonRoutes(entries).map((route) => route.slug),
    [
      "part-1/08-a-place-for-rules",
      "part-1/09-provide-it",
      "part-2/11-your-program",
      "part-2/13-first-tests",
    ],
  )
})

test("prev and next cross part boundaries", () => {
  const [, endOfPart1, startOfPart2] = lessonRoutes(entries)

  assert.equal(endOfPart1.next, "part-2/11-your-program")
  assert.equal(startOfPart2.prev, "part-1/09-provide-it")
})
