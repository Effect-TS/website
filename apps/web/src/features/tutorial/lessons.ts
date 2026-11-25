import { getCollection } from "astro:content"
import { LESSON_FILES, lessonFile, slugForId, type Lesson } from "./model"

const raw = import.meta.glob<string>("/src/content/tutorial/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
})

/** All lessons in tutorial order. */
export async function getLessons(): Promise<ReadonlyArray<Lesson>> {
  const entries = await getCollection("tutorial")
  const chapters = await getCollection("tutorialChapter")
  return entries
    .map((entry): Lesson => {
      const slug = slugForId(entry.id)
      const chapter = slug.split("/")[0] ?? slug
      const chapterEntry = chapters.find(
        (item) => slugForId(item.id) === chapter,
      )
      if (chapterEntry === undefined) {
        throw new Error(`Chapter ${chapter} is missing its index.mdx`)
      }
      return {
        id: entry.id,
        slug,
        chapter,
        chapterTitle: chapterEntry.data.title,
        title: entry.data.title,
        prose: entry.body ?? "",
        main: lessonFile(raw, entry.id, LESSON_FILES.main),
        solution: lessonFile(raw, entry.id, LESSON_FILES.solution),
        test: lessonFile(raw, entry.id, LESSON_FILES.test),
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}
