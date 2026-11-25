import { Data, Effect } from "effect"

export type PaymentToken =
  | "tok_authorized"
  | "tok_declined"
  | "tok_expiredcard"
  | "tok_invalid"
  | "tok_timeout"

export interface Authorization {
  readonly id: string
  readonly status: "authorized" | "declined"
}

export class ExpiredCardError extends Data.TaggedError("ExpiredCardError") {}

export class InvalidTokenError extends Data.TaggedError("InvalidTokenError") {}

export class NetworkError extends Data.TaggedError("NetworkError") {}

export const authorizePayment = Effect.fn(function* (token: PaymentToken) {
  if (token === "tok_expiredcard") {
    return yield* new ExpiredCardError()
  }

  if (token === "tok_invalid") {
    return yield* new InvalidTokenError()
  }

  if (token === "tok_timeout") {
    return yield* new NetworkError()
  }

  const authorization: Authorization =
    token === "tok_declined"
      ? { id: "pauth_456", status: "declined" }
      : { id: "pauth_123", status: "authorized" }

  return authorization
})

export class DoubleCaptureError extends Data.TaggedError("DoubleCaptureError")<{
  readonly id: string
}> {}

const captured = new Set(["pauth_123"])

const capturePayment = Effect.fn(function* (authorization: Authorization) {
  if (captured.has(authorization.id)) {
    return yield* Effect.die(new DoubleCaptureError({ id: authorization.id }))
  }

  captured.add(authorization.id)

  return authorization
})

export const processPayment = Effect.fn(function* (token: PaymentToken) {
  const authorization = yield* authorizePayment(token)

  if (authorization.status === "authorized") {
    yield* capturePayment(authorization)
  }

  return Response.json(authorization)
})

export const handleRequest = <E>(self: Effect.Effect<Response, E>) => self
