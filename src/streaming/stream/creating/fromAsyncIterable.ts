import { Stream } from "effect"

const myAsyncIterable = async function* () {
  yield 1
  yield 2
}

// $ExpectType Stream<1 | 2, Error, never>
const stream = Stream.fromAsyncIterable(
  myAsyncIterable(),
  (e) => new Error(String(e)) // Error Handling
)
