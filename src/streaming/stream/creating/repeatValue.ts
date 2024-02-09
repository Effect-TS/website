import { Stream } from "effect"

// $ExpectType Stream<number, never, never>
const repeatZero = Stream.repeatValue(0)
