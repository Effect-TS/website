import { Stream, Chunk } from "effect"

// Creating a stream with values from multiple Chunks
const stream = Stream.fromChunks(Chunk.make(1, 2, 3), Chunk.make(4, 5, 6))
