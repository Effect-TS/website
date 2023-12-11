import { Chunk } from "effect"

// $ExpectType ReadonlyArray<number>
const readonlyArray = Chunk.toReadonlyArray(Chunk.make(1, 2, 3))
