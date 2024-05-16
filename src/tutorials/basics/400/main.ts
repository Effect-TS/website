import { Effect } from "effect"
import assert from "assert"

const multiplyByTwo = (value: number) => Effect.succeed(value * 2)

const program = Effect.gen(function* (_) {
  const value = yield* multiplyByTwo(42)
  yield* Effect.log(value)
  return value
})

Effect.runPromise(program).then((finalValue) => {
  assert.strictEqual(finalValue, 84)
})
