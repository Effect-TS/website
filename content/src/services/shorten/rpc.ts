import * as Rpc from "@effect/rpc/Rpc"
import * as RpcRouter from "@effect/rpc/RpcRouter"
import { ShortenRequest, RetrieveRequest } from "./domain"
import { Shorten } from "./service"

export const shortenRouter = RpcRouter.make(
  Rpc.effect(ShortenRequest, ({ text }) => Shorten.shorten(text)),
  Rpc.effect(RetrieveRequest, ({ hash }) => Shorten.retrieve(hash))
)
