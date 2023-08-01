import { Effect } from "effect"

// $ExpectType Effect<never, unknown, number[]>
const getNumbers = Effect.tryPromise(() => Promise.resolve([1, 2, 3]))

class EmptyError {
  readonly _tag = "EmptyError"
}

// $ExpectType Effect<never, unknown, number>
const getFirstNumber = Effect.gen(function* (_) {
  const numbers = yield* _(getNumbers)
  if (numbers.length > 0) {
    return numbers[0]
  } else {
    return yield* _(Effect.fail(new EmptyError()))
  }
})
