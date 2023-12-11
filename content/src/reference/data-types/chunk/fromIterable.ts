import { Chunk, List } from "effect"

// $ExpectType Chunk<number>
const fromArray = Chunk.fromIterable([1, 2, 3])

// $ExpectType Chunk<number>
const fromList = Chunk.fromIterable(List.make(1, 2, 3))
