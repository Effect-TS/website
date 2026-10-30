import { Effect, Result } from "effect"
import { assert, it } from "tutorial-test"
import { NotFound, program } from "./main"

it("program fails with NotFound", async () => {
  const result = await Effect.runPromise(Effect.result(program))
  assert.ok(Result.isFailure(result), "program succeeds, but it must fail")
  const error: unknown = result.failure
  assert.ok(error instanceof NotFound, "the error is not a NotFound")
})
