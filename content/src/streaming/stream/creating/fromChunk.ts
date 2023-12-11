import { Stream, Chunk } from "effect"

// Creating a stream with values from a single Chunk
const stream = Stream.fromChunk(Chunk.make(1, 2, 3))
