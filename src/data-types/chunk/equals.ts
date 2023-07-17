import { Chunk, Equal } from "effect"

const chunk1 = Chunk.make(1, 2)
const chunk2 = Chunk.make(1, 2, 3)

// $ExpectType boolean
const areEqual = Equal.equals(chunk1, chunk2)
