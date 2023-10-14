import { Stream } from "effect"

const numbers = [1, 2, 3]

// $ExpectType Stream<never, never, number>
const stream = Stream.fromIterable(numbers)
