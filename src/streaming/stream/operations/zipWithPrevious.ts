import { Stream } from "effect"

const stream = Stream.make(1, 2, 3, 4)

// $ExpectType Stream<[Option<number>, number], never, never>
const s1 = Stream.zipWithPrevious(stream)

// $ExpectType Stream<[number, Option<number>], never, never>
const s2 = Stream.zipWithNext(stream)

// $ExpectType Stream<[Option<number>, number, Option<number>], never, never>
const s3 = Stream.zipWithPreviousAndNext(stream)
