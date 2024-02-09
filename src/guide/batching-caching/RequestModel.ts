import { Request } from "effect"
import * as Model from "./Model"

export interface GetTodos
  extends Request.Request<Array<Model.Todo>, Model.GetTodosError> {
  readonly _tag: "GetTodos"
}

export const GetTodos = Request.tagged<GetTodos>("GetTodos")

export interface GetUserById
  extends Request.Request<Model.User, Model.GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

export const GetUserById = Request.tagged<GetUserById>("GetUserById")

export interface SendEmail extends Request.Request<void, Model.SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

export const SendEmail = Request.tagged<SendEmail>("SendEmail")

export type ApiRequest = GetTodos | GetUserById | SendEmail
