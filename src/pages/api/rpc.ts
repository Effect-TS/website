import type { NextApiRequest, NextApiResponse } from "next"
import { RpcRouter } from "@effect/rpc"
import { Effect, Layer, ManagedRuntime } from "effect"
import { Shorten } from "@/services/Shorten"
import { shortenRouter } from "@/services/Shorten/rpcs"

const router = RpcRouter.make(shortenRouter)

export type RpcRouter = typeof router

const runtime = ManagedRuntime.make(Layer.mergeAll(Shorten.Live))
const handler = RpcRouter.toHandlerNoStream(router)

export default function rpc(req: NextApiRequest, res: NextApiResponse) {
  return handler(req.body).pipe(
    Effect.andThen((body) => {
      res.status(200).json(body)
    }),
    runtime.runPromise
  )
}
