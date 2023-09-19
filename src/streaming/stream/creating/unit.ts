import { Stream } from "effect"

// $ExpectType Stream<never, never, void>
const stream = Stream.unit
