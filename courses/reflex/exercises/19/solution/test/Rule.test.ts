import { assert, it } from "@effect/vitest"
import { Exit, Schema } from "effect"
import { Rule } from "../src/Rule.ts"

const poll = {
  name: "receiver status",
  trigger: { type: "interval", everySeconds: 5, url: "http://localhost:4600/status" },
  action: { type: "appendFile", path: "alerts.log", message: "polled" }
}

const every = (everySeconds: number) =>
  Schema.decodeUnknownExit(Rule)({ ...poll, trigger: { ...poll.trigger, everySeconds } })

it("an interval shorter than 5 seconds is rejected by the schema", () => {
  assert.isTrue(Exit.isFailure(every(4)))
  assert.isTrue(Exit.isFailure(every(0)))
  assert.isTrue(Exit.isSuccess(every(5)))
})
