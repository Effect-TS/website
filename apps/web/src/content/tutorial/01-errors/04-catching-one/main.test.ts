import { Effect, Result } from "effect"
import { assert, it } from "tutorial-test"
import { InvalidTokenError, NetworkError, handlePayment } from "./main"

type ErrorOf<T> =
  T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

it("an expired card becomes a 402 response", async () => {
  const response = await Effect.runPromise(handlePayment("tok_expiredcard"))
  assert.strictEqual(response.status, 402)
  assert.strictEqual(await response.text(), "Card expired")
})

it("the other errors are still not handled", async () => {
  const result = await Effect.runPromise(
    Effect.result(handlePayment("tok_timeout")),
  )
  assert.ok(Result.isFailure(result), "NetworkError must still fail")
  const error: unknown = result.failure
  assert.ok(error instanceof NetworkError, "the error is not NetworkError")
})

it("ExpiredCardError leaves the error type", () => {
  const exact: Equal<
    ErrorOf<ReturnType<typeof handlePayment>>,
    InvalidTokenError | NetworkError
  > = true
  void exact
})
