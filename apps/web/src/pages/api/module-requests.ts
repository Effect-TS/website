import type { APIRoute } from "astro"
import { serve } from "@/features/module-requests/server"

export const prerender = false

export const GET: APIRoute = ({ request }) => serve(request)
