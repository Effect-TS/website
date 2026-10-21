import type { APIRoute } from "astro"
import { serve } from "@/features/motw-vote/server"

export const prerender = false

export const GET: APIRoute = ({ request }) => serve(request)
