import type { APIRoute } from "astro"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import type { ModuleCatalog } from "@/features/motw-vote/catalog"
import * as Cloudflare from "@/features/motw-vote/cloudflare"
import { type ClientRateLimit, Turnstile } from "@/features/motw-vote/guards"
import { MotwVoteLive } from "@/features/motw-vote/server"
import type { VoteStore } from "@/features/motw-vote/vote-store"

export const prerender = false

// A build removes the development branch, so `dev.ts` and `astro:content` stay
// out of the Worker and the Worker has no dynamic import to resolve.
const Environment: Layer.Layer<VoteStore | ClientRateLimit | ModuleCatalog> =
  import.meta.env.DEV
    ? Layer.unwrap(
        Effect.promise(() => import("@/features/motw-vote/dev")).pipe(
          Effect.map(({ layer }) => layer),
        ),
      )
    : Cloudflare.layer

const { dispose, handler } = HttpRouter.toWebHandler(
  MotwVoteLive.pipe(
    Layer.provide(Turnstile.layer),
    Layer.provide(Environment),
    Layer.provide(HttpServer.layerServices),
  ),
)

export const GET: APIRoute = ({ request }) => handler(request)
export const POST: APIRoute = ({ request }) => handler(request)

function cleanup() {
  dispose().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}

process.on("SIGINT", cleanup)
