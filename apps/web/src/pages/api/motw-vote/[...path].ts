import type { APIRoute } from "astro"
import { dispose, handler } from "@/features/motw-vote/server"

export const prerender = false

export const GET: APIRoute = ({ request }) => handler(request)
export const POST: APIRoute = ({ request }) => handler(request)

function cleanup() {
  dispose().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}

process.on("SIGINT", cleanup)
