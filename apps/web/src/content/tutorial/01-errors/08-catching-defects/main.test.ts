import { Cause, Effect, Exit, Result } from "effect"
import { assert, it } from "tutorial-test"
import { ExpiredCardError, handleRequest, processPayment } from "./main"

it("a known defect becomes a 500 response", async () => {
  const response = await Effect.runPromise(
    handleRequest(processPayment("tok_authorized")),
  ).catch(() => {
    throw new Error("the DoubleCaptureError defect is not handled")
  })
  assert.strictEqual(response.status, 500)
  assert.strictEqual(await response.text(), "pauth_123 already captured")
})

it("an unknown defect still stops the Effect", async () => {
  const exit = await Effect.runPromiseExit(handleRequest(Effect.die("boom")))
  assert.ok(Exit.isFailure(exit), "an unknown defect must not be handled")
  const defect = Cause.findDefect(exit.cause)
  assert.ok(
    Result.isSuccess(defect),
    "the unknown defect was turned into an error",
  )
  assert.strictEqual(defect.success, "boom")
})

it("expected errors are left for catchTag", async () => {
  const exit = await Effect.runPromiseExit(
    handleRequest(processPayment("tok_expiredcard")),
  )
  assert.ok(Exit.isFailure(exit), "the expected error must stay")
  const failure = Cause.findError(exit.cause)
  assert.ok(Result.isSuccess(failure), "the expected error became a defect")
  assert.ok(failure.success instanceof ExpiredCardError, "wrong error")
})
