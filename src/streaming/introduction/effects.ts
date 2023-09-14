import { Effect, Chunk, Option } from "effect"

// An Effect that fails with a string error
const failedEffect = Effect.fail("fail!")

// An Effect that produces a single number
const oneNumberValue = Effect.succeed(3)

// An Effect that produces a chunk of numbers
const oneListValue = Effect.succeed(Chunk.make(1, 2, 3))

// An Effect that produces an optional number
const oneOption = Effect.succeed(Option.some(1))
