import type { APIRoute } from "astro"
import { handler } from "@/features/motw-vote/server"

export const prerender = false

export const GET: APIRoute = ({ request }) => handler(request)
export const POST: APIRoute = ({ request }) => handler(request)
