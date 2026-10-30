import type { APIRoute } from "astro"
import { getLessons } from "@/features/tutorial/lessons"
import { lessonCode, type LessonCode } from "@/features/tutorial/model"
import { cacheKey, digest } from "@/lib/cache-key"

export const prerender = true

export async function getStaticPaths() {
  const lessons = await getLessons()
  return lessons.map((lesson) => ({
    params: { slug: lesson.slug },
    props: { code: lessonCode(lesson) },
    cacheKey: cacheKey(digest(lesson)),
  }))
}

export const GET: APIRoute = ({ props }) =>
  Response.json((props as { code: LessonCode }).code)
