import { Stream } from "effect"

// $ExpectType Stream<never, never, never>
const stream = Stream.empty
