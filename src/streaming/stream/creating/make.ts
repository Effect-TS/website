import { Stream } from "effect"

// $ExpectType Stream<never, never, number>
const stream = Stream.make(1, 2, 3)
