import { Effect, RequestResolver, Request } from "effect"
import * as API from "./API"
import * as Model from "./Model"
import * as RequestModel from "./RequestModel"

// we assume we cannot batch GetTodos, we create a normal resolver
// $ExpectType RequestResolver<GetTodos, never>
export const GetTodosResolver = RequestResolver.fromEffect(
  (request: RequestModel.GetTodos) =>
    Effect.tryPromise({
      try: () =>
        API.simulatedValidation<Array<Model.Todo>>(
          fetch("https://api.example.demo/todos")
        ),
      catch: () => new Model.GetTodosError()
    })
)

// we assume we can batch GetUserById, we create a batched resolver
// $ExpectType RequestResolver<GetUserById, never>
export const GetUserByIdResolver = RequestResolver.makeBatched(
  (requests: Array<RequestModel.GetUserById>) =>
    Effect.tryPromise({
      try: () =>
        API.simulatedValidation<Array<Model.User>>(
          fetch("https://api.example.demo/getUserByIdBatch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ users: requests.map(({ id }) => ({ id })) })
          })
        ),
      catch: () => new Model.GetUserError()
    }).pipe(
      Effect.flatMap((users) =>
        Effect.forEach(requests, (request, index) =>
          Request.completeEffect(request, Effect.succeed(users[index]))
        )
      ),
      Effect.catchAll((error) =>
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.fail(error))
        )
      )
    )
)

// we assume we can batch SendEmail, we create a batched resolver
// $ExpectType RequestResolver<SendEmail, never>
export const SendEmailResolver = RequestResolver.makeBatched(
  (requests: Array<RequestModel.SendEmail>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/sendEmailBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emails: requests.map(({ address, text }) => ({ address, text }))
          })
        }).then((_) => _.json()),
      catch: () => new Model.SendEmailError()
    }).pipe(
      Effect.flatMap(() =>
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.unit)
        )
      ),
      Effect.catchAll((error) =>
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.fail(error))
        )
      )
    )
)
