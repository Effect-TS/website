import { Chunk } from "effect"

// $ExpectType NonEmptyChunk<number>
const nonEmptyChunk = Chunk.make(1, 2, 3)
