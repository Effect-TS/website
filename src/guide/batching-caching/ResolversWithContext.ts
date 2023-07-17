import { Effect, Context, Layer, RequestResolver } from "effect"
import * as Model from "./Model"
import * as RequestModel from "./RequestModel"

export interface HttpService {
  fetch: typeof fetch
}

export const HttpService = Context.Tag<HttpService>(
  Symbol.for("@app/services/HttpService")
)

export const HttpServiceLive = Layer.sync(HttpService, () =>
  HttpService.of({ fetch })
)

export const GetTodosResolver: Effect.Effect<
  HttpService,
  never,
  RequestResolver.RequestResolver<RequestModel.GetTodos, never>
> =
  // we create a normal resolver like we did before
  RequestResolver.fromFunctionEffect((request: RequestModel.GetTodos) =>
    Effect.flatMap(HttpService, (http) =>
      Effect.tryPromise({
        try: () =>
          http
            .fetch("https://api.example.demo/todos")
            .then((_) => _.json()) as Promise<Array<Model.Todo>>,
        catch: () => new Model.GetTodosError(),
      })
    )
  ).pipe(
    // we list the tags that the resolver can access
    RequestResolver.contextFromServices(HttpService)
  )
