import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServer from "effect/http/HttpServer"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import { ModuleRequestsApi } from "./api"
import { apiReferenceLayer } from "./catalog"
import * as D1 from "./d1"
import { ModuleVotes } from "./service"
import { memoryLayer } from "./vote-store"

const Handlers = HttpApiBuilder.group(
  ModuleRequestsApi,
  "moduleRequests",
  Effect.fn(function* (handlers) {
    const votes = yield* ModuleVotes
    return handlers
      .handle("ranking", ({ headers }) => votes.ranking(headers["x-voter-id"]))
      .handle("vote", ({ headers, payload }) =>
        votes.vote(headers["x-voter-id"], payload.id, payload.on),
      )
  }),
).pipe(Layer.provide(ModuleVotes.layer))

// The Worker's bindings. `astro dev` has no `cloudflare:workers` module, so
// the import waits until deployed.
const loadEnv = async () =>
  import.meta.env.DEV ? undefined : (await import("cloudflare:workers")).env

// Deployed, the Worker has the D1 binding. Without it, such as in `astro dev`,
// votes live in memory for as long as the server runs.
const store = Layer.unwrap(
  Effect.promise(loadEnv).pipe(
    Effect.map((env) => (env?.DB ? D1.layer(env.DB) : memoryLayer)),
  ),
)

const ModuleRequestsLayer = HttpApiBuilder.layer(ModuleRequestsApi).pipe(
  Layer.provide(Handlers),
  Layer.provide(Layer.mergeAll(store, apiReferenceLayer)),
  Layer.provide(HttpServer.layerServices),
)

export const { handler } = HttpRouter.toWebHandler(ModuleRequestsLayer)

/**
 * Whether this request may vote. Deployed, the `MODULE_VOTES_LIMIT` rate-limit
 * binding counts requests per client address. Without the binding, anything
 * goes.
 */
export const mayVote = async (request: Request): Promise<boolean> => {
  const key = request.headers.get("cf-connecting-ip")
  const limiter = (await loadEnv())?.MODULE_VOTES_LIMIT
  if (!limiter || !key) return true
  return (await limiter.limit({ key })).success
}
