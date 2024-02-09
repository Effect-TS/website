import { Effect, Context, Layer, RequestResolver } from "effect"
import * as API from "./API"
import * as Model from "./Model"
import * as RequestModel from "./RequestModel"

export class HttpService extends Context.Tag("@app/services/HttpService")<
  HttpService,
  { fetch: typeof fetch }
>() {}

export const HttpServiceLive = Layer.sync(HttpService, () => ({ fetch }))

export const GetTodosResolver: Effect.Effect<
  RequestResolver.RequestResolver<RequestModel.GetTodos, never>,
  never,
  HttpService
> =
  // we create a normal resolver like we did before
  RequestResolver.fromEffect((request: RequestModel.GetTodos) =>
    Effect.flatMap(HttpService, (http) =>
      Effect.tryPromise({
        try: () =>
          API.simulatedValidation<Array<Model.Todo>>(
            http.fetch("https://api.example.demo/todos")
          ),
        catch: () => new Model.GetTodosError()
      })
    )
  ).pipe(
    // we list the tags that the resolver can access
    RequestResolver.contextFromServices(HttpService)
  )
