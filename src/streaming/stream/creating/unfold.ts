import { Stream, Option } from "effect"

// $ExpectType Stream<number, never, never>
const nats = Stream.unfold(1, (n) => Option.some([n, n + 1]))
