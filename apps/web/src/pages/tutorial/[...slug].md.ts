import type { APIRoute } from "astro"
import { getLessons } from "@/features/tutorial/lessons"
import { lessonToMarkdown, type Lesson } from "@/features/tutorial/model"
import { cacheKey, digest } from "@/lib/cache-key"

export const prerender = true

export async function getStaticPaths() {
  const lessons = await getLessons()
  return lessons.map((lesson) => ({
    params: { slug: lesson.slug },
    props: { lesson },
    cacheKey: cacheKey(digest(lesson)),
  }))
}

export const GET: APIRoute = ({ props }) =>
  new Response(lessonToMarkdown((props as { lesson: Lesson }).lesson), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
