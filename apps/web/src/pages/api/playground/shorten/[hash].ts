import type { APIRoute } from "astro"
import { handler } from "@/features/playground/services/shorten/server"

export const prerender = false

export const GET: APIRoute = ({ request }) => handler(request)
