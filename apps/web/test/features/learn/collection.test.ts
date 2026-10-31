import { assert, test } from "vite-plus/test"
import { LearnEntry } from "../../../src/features/learn/collection.ts"

const playground = {
  part: 1,
  order: 3,
  title: "Steps in order",
  minutes: 8,
  mode: "playground",
  lessonDir: "03-steps-in-order",
}
const local = {
  part: 2,
  order: 11,
  title: "Your program, your entrypoint",
  minutes: 20,
  mode: "local",
}

test("accepts playground and local lessons", () => {
  assert.isTrue(LearnEntry.safeParse(playground).success)
  assert.isTrue(LearnEntry.safeParse(local).success)
})

test("rejects lessons outside the contract", () => {
  const { lessonDir: _, ...withoutLessonDir } = playground
  const invalid = [
    withoutLessonDir,
    { ...local, part: 0 },
    { ...local, part: 5 },
    { ...local, mode: "video" },
    ...(["part", "order", "title", "minutes", "mode"] as const).map((key) => {
      const { [key]: _, ...rest } = local
      return rest
    }),
  ]

  for (const entry of invalid) {
    assert.isFalse(LearnEntry.safeParse(entry).success, JSON.stringify(entry))
  }
})
