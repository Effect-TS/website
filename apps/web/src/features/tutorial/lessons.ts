import { getCollection } from "astro:content"
import {
  LESSON_FILES,
  chapterTitle,
  lessonFile,
  slugForId,
  type Lesson,
} from "./model"

const raw = import.meta.glob<string>("/src/content/tutorial/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
})

export { chapterTitle }

/** All lessons in tutorial order. */
export async function getLessons(): Promise<ReadonlyArray<Lesson>> {
  const entries = await getCollection("tutorial")
  return entries
    .map((entry): Lesson => {
      const slug = slugForId(entry.id)
      return {
        id: entry.id,
        slug,
        chapter: slug.split("/")[0] ?? slug,
        title: entry.data.title,
        prose: entry.body ?? "",
        main: lessonFile(raw, entry.id, LESSON_FILES.main),
        solution: lessonFile(raw, entry.id, LESSON_FILES.solution),
        test: lessonFile(raw, entry.id, LESSON_FILES.test),
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}
