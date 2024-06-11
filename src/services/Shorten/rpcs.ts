import { Router, Rpc } from "@effect/rpc"
import { RetrieveRequest, ShortenRequest } from "./domain"
import { Shorten } from "../Shorten"

export const shortenRouter = Router.make(
  Rpc.effect(ShortenRequest, ({ text }) => Shorten.shorten(text)),
  Rpc.effect(RetrieveRequest, ({ hash }) => Shorten.retrieve(hash))
)
