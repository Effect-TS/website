import type { APIRoute } from "astro"
import { getLessons } from "@/features/tutorial/lessons"
import { llmsIndex } from "@/features/tutorial/model"

export const prerender = true

export const GET: APIRoute = async () =>
  new Response(llmsIndex(await getLessons()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
