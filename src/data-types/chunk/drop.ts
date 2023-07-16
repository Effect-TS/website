import { Chunk } from "effect"

// $ExpectType Chunk<number>
const droppedChunk = Chunk.drop(Chunk.make(1, 2, 3, 4), 2) // Drops the first 2 elements from the Chunk
