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
): Effect.Effect<never, NegativeAgeError | IllegalAgeError, number> => {
  if (age < 0) {
    return Effect.fail(new NegativeAgeError(age))
  } else if (age < 18) {
    return Effect.fail(new IllegalAgeError(age))
  } else {
    return Effect.succeed(age)
  }
}

// $ExpectType Effect<never, string, number>
const program1 = validate(3).pipe(Effect.orElseFail(() => "invalid age"))

// $ExpectType Effect<never, never, number>
const program2 = validate(3).pipe(Effect.orElseSucceed(() => 0))
