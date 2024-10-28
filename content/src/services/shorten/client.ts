import type { RpcRouter } from "@/pages/api/rpc"
import * as Resolver from "@effect/rpc-http/HttpRpcResolverNoStream"

export const rpcClient = Resolver.makeClient<RpcRouter>("/api/rpc/")
