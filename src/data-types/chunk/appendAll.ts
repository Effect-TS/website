import { Chunk } from "effect"

// $ExpectType Chunk<string | number>
const concatenatedChunk = Chunk.appendAll(
  Chunk.make(1, 2),
  Chunk.make("a", "b")
)

console.log(concatenatedChunk) // Output: Chunk(1, 2, "a", "b")
