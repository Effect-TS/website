import { Effect } from "effect"
import * as Model from "./Model"

// $ExpectType Effect<never, GetTodosError, Todo[]>
export const getTodos = Effect.tryPromise({
  try: () =>
    fetch("https://api.example.demo/todos").then(
      (_) => _.json() as Promise<Array<Model.Todo>>
    ),
  catch: () => new Model.GetTodosError(),
})

// $ExpectType (id: number) => Effect<never, GetUserError, User>
export const getUserById = (id: number) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://api.example.demo/getUserById?id=${id}`).then(
        (_) => _.json() as Promise<Model.User>
      ),
    catch: () => new Model.GetUserError(),
  })

// $ExpectType (address: string, text: string) => Effect<never, SendEmailError, void>
export const sendEmail = (address: string, text: string) =>
  Effect.tryPromise({
    try: () =>
      fetch("https://api.example.demo/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address, text }),
      }).then((_) => _.json() as Promise<void>),
    catch: () => new Model.SendEmailError(),
  })

// $ExpectType (id: number, message: string) => Effect<never, GetUserError | SendEmailError, void>
export const sendEmailToUser = (id: number, message: string) =>
  Effect.flatMap(getUserById(id), (user) => sendEmail(user.email, message))

// $ExpectType (todo: Todo) => Effect<never, GetUserError | SendEmailError, void>
export const notifyOwner = (todo: Model.Todo) =>
  Effect.flatMap(getUserById(todo.ownerId), (user) =>
    sendEmailToUser(user.id, `hey ${user.name} you got a todo!`)
  )
