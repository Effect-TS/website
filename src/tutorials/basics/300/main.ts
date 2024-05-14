import { Effect } from "effect"
import assert from "assert"

const multiplyByTwo = (value: number) => Effect.succeed(value * 2)

const promise = Effect.succeed(42).pipe(
  Effect.andThen(multiplyByTwo),
  Effect.tap((value) => Effect.log(value)),
  Effect.runPromise
)

promise.then((finalValue) => {
  assert.strictEqual(finalValue, 84)
})
