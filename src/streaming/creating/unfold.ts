import { Stream, Option } from "effect"

// $ExpectType Stream<never, never, number>
const nats = Stream.unfold(1, (n) => Option.some([n, n + 1]))
