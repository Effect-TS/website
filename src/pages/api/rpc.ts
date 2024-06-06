import type { NextApiRequest, NextApiResponse } from "next"
import { Router } from "@effect/rpc"
import { Effect, Layer, ManagedRuntime } from "effect"
import { Shorten } from "@/services/Shorten"
import { shortenRouter } from "@/services/Shorten/rpcs"

const router = Router.make(shortenRouter)

export type RpcRouter = typeof router

const runtime = ManagedRuntime.make(Layer.mergeAll(Shorten.Live))
const handler = Router.toHandlerEffect(router)

export default function rpc(req: NextApiRequest, res: NextApiResponse) {
  return handler(req.body).pipe(
    Effect.flatMap((body) =>
      Effect.sync(() => {
        res.status(200).json(body)
      })
    ),
    runtime.runPromise
  )
}
