import type { RpcRouter } from "@/pages/api/rpc"
import * as Resolver from "@effect/rpc-http/HttpResolverNoStream"

export const rpcClient = Resolver.makeClient<RpcRouter>("/api/rpc")
