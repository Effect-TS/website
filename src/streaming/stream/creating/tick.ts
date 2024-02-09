import { Stream } from "effect"

// $ExpectType Stream<void, never, never>
const stream = Stream.tick("2 seconds")
