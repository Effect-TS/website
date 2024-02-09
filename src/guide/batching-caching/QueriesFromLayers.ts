import { Effect, Context, Layer, RequestResolver } from "effect"
import * as API from "./API"
import * as Model from "./Model"
import * as RequestModel from "./RequestModel"
import * as ResolversWithContext from "./ResolversWithContext"

export class TodosService extends Context.Tag("@app/services/TodosService")<
  TodosService,
  { getTodos: Effect.Effect<Array<Model.Todo>, Model.GetTodosError> }
>() {}

export const TodosServiceLive = Layer.effect(
  TodosService,
  Effect.gen(function* ($) {
    const http = yield* $(ResolversWithContext.HttpService)
    const resolver = RequestResolver.fromEffect(
      (request: RequestModel.GetTodos) =>
        Effect.tryPromise({
          try: () =>
            API.simulatedValidation<Array<Model.Todo>>(
              http.fetch("https://api.example.demo/todos")
            ),
          catch: () => new Model.GetTodosError()
        })
    )
    return {
      getTodos: Effect.request(RequestModel.GetTodos({}), resolver)
    }
  })
)

export const getTodos: Effect.Effect<
  Array<Model.Todo>,
  Model.GetTodosError,
  TodosService
> = Effect.flatMap(TodosService, (service) => service.getTodos)
