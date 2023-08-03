import { Effect } from "effect"

class GetNumbersError {
  readonly _tag = "GetNumbersError"
}

// $ExpectType Effect<never, GetNumbersError, number[]>
const getNumbers = Effect.tryPromise({
  try: () => Promise.resolve([1, 2, 3]),
  catch: () => new GetNumbersError()
})

class EmptyError {
  readonly _tag = "EmptyError"
}

// $ExpectType Effect<never, GetNumbersError | EmptyError, number>
const getFirstNumber = Effect.gen(function* (_) {
  const numbers = yield* _(getNumbers)
  if (numbers.length > 0) {
    return numbers[0]
  } else {
    return yield* _(Effect.fail(new EmptyError()))
  }
})
