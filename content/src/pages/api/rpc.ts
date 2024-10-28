import type { APIRoute } from "astro"
import * as Router from "@effect/rpc/RpcRouter"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Effect from "effect/Effect"
import { shortenRouter } from "@/services/shorten/rpc"
import { Shorten } from "@/services/shorten/service"

export const prerender = false

const router = Router.make(shortenRouter)

export type RpcRouter = typeof router

const runtime = ManagedRuntime.make(Shorten.Default)
const handler = Router.toHandlerNoStream(router)

export const POST: APIRoute = async ({ request }) => {
  return Effect.promise(() => request.json()).pipe(
    Effect.flatMap((json) => handler(json)),
    Effect.map((response) => new Response(JSON.stringify(response), { status: 200 })),
    runtime.runPromise
  )
}


