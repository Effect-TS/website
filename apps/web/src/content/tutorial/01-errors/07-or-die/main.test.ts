import { Cause, Effect, Exit, Result } from "effect"
import { assert, it } from "tutorial-test"
import { ExpiredCardError, reconcile } from "./main"

type ErrorOf<T> =
  T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

it("the typed error becomes a defect", async () => {
  const exit = await Effect.runPromiseExit(reconcile)
  assert.ok(Exit.isFailure(exit), "reconcile must stop")
  const defect = Cause.findDefect(exit.cause)
  assert.ok(Result.isSuccess(defect), "the error is still a typed error")
  assert.ok(
    defect.success instanceof ExpiredCardError,
    "the defect is not the ExpiredCardError",
  )
})

it("reconcile has no expected errors left", () => {
  const exact: Equal<ErrorOf<typeof reconcile>, never> = true
  void exact
})
