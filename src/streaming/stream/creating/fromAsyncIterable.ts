import { Stream } from "effect"

const myAsyncIterable = async function* () {
  yield 1
  yield 2
}

// $ExpectType Stream<never, Error, 2 | 1>
const stream = Stream.fromAsyncIterable(
  myAsyncIterable(),
  (e) => new Error(String(e)) // Error Handling
)
