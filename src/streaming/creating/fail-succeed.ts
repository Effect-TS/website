import { Stream } from "effect"

// Creating a stream that can emit errors
const streamWithError: Stream.Stream<never, string, never> =
  Stream.fail("Uh oh!")

// Creating a stream that emits a numeric value
const streamWithNumber: Stream.Stream<never, never, number> = Stream.succeed(5)
