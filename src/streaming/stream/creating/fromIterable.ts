import { Stream } from "effect"

const numbers = [1, 2, 3]

// $ExpectType Stream<number, never, never>
const stream = Stream.fromIterable(numbers)
