import type { APIRoute } from "astro"
import { handler } from "@/features/search/handler"

export const prerender = false

export const GET: APIRoute = ({ request }) => handler(request)
