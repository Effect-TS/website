import { Effect, Result } from "effect"
import { assert, it } from "tutorial-test"
import {
  ExpiredCardError,
  InvalidTokenError,
  NetworkError,
  processPayment,
} from "./main"

type ErrorOf<T> =
  T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

it("an authorized payment becomes a JSON response", async () => {
  const response = await Effect.runPromise(processPayment("tok_authorized"))
  assert.strictEqual(response.status, 200)
  const body: unknown = await response.json()
  assert.strictEqual(
    JSON.stringify(body),
    '{"id":"pauth_123","status":"authorized"}',
  )
})

it("a failure from authorizePayment propagates", async () => {
  const result = await Effect.runPromise(
    Effect.result(processPayment("tok_expiredcard")),
  )
  assert.ok(Result.isFailure(result), "the failure was swallowed")
  const error: unknown = result.failure
  assert.ok(
    error instanceof ExpiredCardError,
    "the error is not ExpiredCardError",
  )
})

it("processPayment keeps the same three errors in its type", () => {
  const exact: Equal<
    ErrorOf<ReturnType<typeof processPayment>>,
    ExpiredCardError | InvalidTokenError | NetworkError
  > = true
  void exact
})
