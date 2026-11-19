import { Effect, Result } from "effect"
import { assert, it } from "tutorial-test"
import {
  Authorization,
  ExpiredCardError,
  InvalidTokenError,
  NetworkError,
  PaymentToken,
  authorizePayment,
} from "./main"

type ErrorOf<T> =
  T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

const outcome = (token: PaymentToken) =>
  Effect.runPromise(Effect.result(authorizePayment(token))).catch(() => {
    throw new Error(`${token} throws. It must fail inside the Effect type`)
  })

const failsWith = async (token: PaymentToken, expected: new () => unknown) => {
  const result = await outcome(token)
  assert.ok(Result.isFailure(result), `${token} must fail`)
  const error: unknown = result.failure
  assert.ok(error instanceof expected, `${token} fails with the wrong error`)
}

it("a successful token returns an Authorization", async () => {
  const result = await outcome("tok_authorized")
  assert.ok(Result.isSuccess(result), "tok_authorized must succeed")
  const authorization: Authorization = result.success
  assert.strictEqual(authorization.id, "pauth_123")
})

it("an expired card fails with ExpiredCardError", () =>
  failsWith("tok_expiredcard", ExpiredCardError))

it("an invalid token fails with InvalidTokenError", () =>
  failsWith("tok_invalid", InvalidTokenError))

it("a timeout fails with NetworkError", () =>
  failsWith("tok_timeout", NetworkError))

it("the Effect type lists all three errors", () => {
  const exact: Equal<
    ErrorOf<ReturnType<typeof authorizePayment>>,
    ExpiredCardError | InvalidTokenError | NetworkError
  > = true
  void exact
})
