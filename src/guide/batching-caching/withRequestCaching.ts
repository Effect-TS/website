import { Effect } from "effect"
import * as RequestModel from "./RequestModel"
import * as Resolvers from "./Resolvers"

export const getUserById = (id: number) =>
  Effect.request(
    RequestModel.GetUserById({ id }),
    Resolvers.GetUserByIdResolver
  ).pipe(Effect.withRequestCaching(true))
