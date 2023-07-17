import { Effect } from "effect"
import * as Model from "./Model"
import * as RequestModel from "./RequestModel"
import * as ResolversWithContext from "./ResolversWithContext"

export const getTodos: Effect.Effect<
  ResolversWithContext.HttpService,
  Model.GetTodosError,
  Array<Model.Todo>
> = Effect.request(
  RequestModel.GetTodos({}),
  ResolversWithContext.GetTodosResolver
)
