import { Chunk } from "effect"

// $ExpectType Chunk<never>
const emptyChunk = Chunk.empty()
