import { Effect } from "effect"
import { assert, it } from "tutorial-test"
import { program } from "./main"

it("program succeeds with guest", async () => {
  assert.strictEqual(await Effect.runPromise(program), "guest")
})
