import { Effect } from "effect"
import * as Model from "./Model"

export const simulatedValidation = async <A>(
  promise: Promise<Response>
): Promise<A> => {
  // In a real world scenario we may not want to trust our APIs to actually return the expected data
  return promise.then((res) => res.json() as Promise<A>)
}

// $ExpectType Effect<never, GetTodosError, Todo[]>
export const getTodos = Effect.tryPromise({
  try: () =>
    simulatedValidation<Array<Model.Todo>>(
      fetch("https://api.example.demo/todos")
    ),
  catch: () => new Model.GetTodosError(),
})

// $ExpectType (id: number) => Effect<never, GetUserError, User>
export const getUserById = (id: number) =>
  Effect.tryPromise({
    try: () =>
      simulatedValidation<Model.User>(
        fetch(`https://api.example.demo/getUserById?id=${id}`)
      ),
    catch: () => new Model.GetUserError(),
  })

// $ExpectType (address: string, text: string) => Effect<never, SendEmailError, void>
export const sendEmail = (address: string, text: string) =>
  Effect.tryPromise({
    try: () =>
      simulatedValidation<void>(
        fetch("https://api.example.demo/sendEmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address, text }),
        })
      ),
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
