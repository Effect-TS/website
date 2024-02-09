import { Stream } from "effect"

// Creating a stream that can emit errors
const streamWithError: Stream.Stream<never, string> = Stream.fail("Uh oh!")

// Creating a stream that emits a numeric value
const streamWithNumber: Stream.Stream<number, never> = Stream.succeed(5)
