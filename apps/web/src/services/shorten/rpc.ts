import * as Schema from "effect/Schema"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcGroup from "effect/unstable/rpc/RpcGroup"
import { ShortenError } from "./domain"

export class ShortenRpcs extends RpcGroup.make(
  Rpc.make("shorten", {
    payload: { text: Schema.String },
    error: ShortenError,
    success: Schema.String,
  }),
  Rpc.make("retrieve", {
    payload: { hash: Schema.String },
    error: ShortenError,
    success: Schema.Option(Schema.String),
  }),
) {}
