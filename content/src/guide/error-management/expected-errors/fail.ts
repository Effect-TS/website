import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

// $ExpectType Effect<never, HttpError, never>
const program = Effect.fail(new HttpError())
