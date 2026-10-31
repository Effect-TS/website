import { Cause, Effect, Exit, Result } from "effect"
import { assert, it } from "tutorial-test"
import { DoubleCaptureError, capturePayment } from "./main"

type ErrorOf<T> =
  T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

const authorization = { id: "pauth_test", status: "authorized" } as const

it("the first capture succeeds", async () => {
  const captured = await Effect.runPromise(capturePayment(authorization))
  assert.strictEqual(captured.id, "pauth_test")
})

it("a second capture stops with a DoubleCaptureError defect", async () => {
  const exit = await Effect.runPromiseExit(capturePayment(authorization))
  assert.ok(Exit.isFailure(exit), "the second capture must stop")
  const defect = Cause.findDefect(exit.cause)
  assert.ok(
    Result.isSuccess(defect),
    "the Effect stopped, but not with a defect",
  )
  assert.ok(
    defect.success instanceof DoubleCaptureError,
    "the defect is not a DoubleCaptureError",
  )
})

it("DoubleCaptureError stays out of the error type", () => {
  const exact: Equal<ErrorOf<ReturnType<typeof capturePayment>>, never> = true
  void exact
})
