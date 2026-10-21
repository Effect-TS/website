import type { APIRoute } from "astro"
import { handler } from "@/features/module-requests/server"

export const prerender = false

export const GET: APIRoute = ({ request }) => handler(request)
