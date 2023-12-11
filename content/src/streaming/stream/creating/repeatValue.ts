import { Stream } from "effect"

// $ExpectType Stream<never, never, number>
const repeatZero = Stream.repeatValue(0)
