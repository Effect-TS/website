import { Chunk } from "effect"

// $ExpectType Chunk<number>
const fromUnsafeArray = Chunk.unsafeFromArray([1, 2, 3])
