import { Stream, Option } from "effect"

// $ExpectType Stream<never, Error, never>
const stream = Stream.fail<Error>(new Error())

// $ExpectType Stream<never, SyntaxError, never>
const res = Stream.refineOrDie(stream, (error) => {
  if (error instanceof SyntaxError) {
    return Option.some(error)
  }
  return Option.none()
})
