import type { APIRoute } from "astro"
import { dispose, handler } from "@/features/playground/services/shorten/server"

export const prerender = false

export const POST: APIRoute = ({ request }) => handler(request)

function cleanup() {
  dispose().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}

process.on("SIGINT", cleanup)
