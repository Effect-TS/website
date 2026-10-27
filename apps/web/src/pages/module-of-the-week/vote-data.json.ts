import type { APIRoute } from "astro"
import { getVoteData } from "@/features/motw-vote/http"

// Written at build time. The vote server reads it through the `ASSETS` binding
// to check which modules can be voted for.
export const prerender = true

export const GET: APIRoute = async () => Response.json(await getVoteData())
