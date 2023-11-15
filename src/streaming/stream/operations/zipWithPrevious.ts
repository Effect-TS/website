import { Stream } from "effect"

const stream = Stream.make(1, 2, 3, 4)

// $ExpectType Stream<never, never, [Option<number>, number]>
const s1 = Stream.zipWithPrevious(stream)

// $ExpectType Stream<never, never, [number, Option<number>]>
const s2 = Stream.zipWithNext(stream)

// $ExpectType Stream<never, never, [Option<number>, number, Option<number>]>
const s3 = Stream.zipWithPreviousAndNext(stream)
