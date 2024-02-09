import { Stream } from "effect"

// $ExpectType Stream<number, never, never>
const stream = Stream.make(1, 2, 3)
