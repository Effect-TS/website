import { Request } from "effect"
import * as Model from "./Model"

export interface GetTodos
  extends Request.Request<Model.GetTodosError, Array<Model.Todo>> {
  readonly _tag: "GetTodos"
}

export const GetTodos = Request.tagged<GetTodos>("GetTodos")

export interface GetUserById
  extends Request.Request<Model.GetUserError, Model.User> {
  readonly _tag: "GetUserById"
  readonly id: number
}

export const GetUserById = Request.tagged<GetUserById>("GetUserById")

export interface SendEmail extends Request.Request<Model.SendEmailError, void> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

export const SendEmail = Request.tagged<SendEmail>("SendEmail")

export type ApiRequest = GetTodos | GetUserById | SendEmail
