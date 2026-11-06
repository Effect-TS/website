import type { LessonCode } from "./model"

export interface LoadedLesson {
  readonly code: LessonCode
  readonly html: string
}

const cache = new Map<string, Promise<LoadedLesson>>()

async function get(url: string): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response
}

/** Fetches a lesson once. The prose is an HTML fragment built at deploy time. */
export function loadLesson(slug: string): Promise<LoadedLesson> {
  let lesson = cache.get(slug)
  if (lesson === undefined) {
    lesson = Promise.all([
      get(`/tutorial/data/${slug}.json`).then(
        (response) => response.json() as Promise<LessonCode>,
      ),
      get(`/tutorial/prose/${slug}`).then((response) => response.text()),
    ]).then(([code, html]) => ({ code, html }))
    lesson.catch(() => cache.delete(slug))
    cache.set(slug, lesson)
  }
  return lesson
}
