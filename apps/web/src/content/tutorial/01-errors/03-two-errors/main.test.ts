import { Effect } from "effect"
import { assert, it } from "tutorial-test"
import { program } from "./main"

const cannotFail: Effect.Effect<string> = program

it("program recovers from Forbidden with blocked", async () => {
  assert.strictEqual(await Effect.runPromise(cannotFail), "blocked")
})
