import type { APIRoute } from "astro"
import { handler, mayVote } from "@/features/module-requests/server"

export const prerender = false

export const POST: APIRoute = async ({ request }) =>
  (await mayVote(request))
    ? handler(request)
    : Response.json(
        { _tag: "VoteRefusedError", reason: "RateLimited" },
        { status: 429 },
      )
