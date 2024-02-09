import { Effect } from "effect"

class NegativeAgeError {
  readonly _tag = "NegativeAgeError"
  constructor(readonly age: number) {}
}

class IllegalAgeError {
  readonly _tag = "IllegalAgeError"
  constructor(readonly age: number) {}
}

const validate = (
  age: number
): Effect.Effect<number, NegativeAgeError | IllegalAgeError> => {
  if (age < 0) {
    return Effect.fail(new NegativeAgeError(age))
  } else if (age < 18) {
    return Effect.fail(new IllegalAgeError(age))
  } else {
    return Effect.succeed(age)
  }
}

// $ExpectType Effect<number, string, never>
const program1 = Effect.orElseFail(validate(3), () => "invalid age")

// $ExpectType Effect<number, never, never>
const program2 = Effect.orElseSucceed(validate(3), () => 0)
