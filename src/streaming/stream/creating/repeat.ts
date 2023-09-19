import { Stream, Schedule } from "effect"

// Creating a stream that repeats a value indefinitely
const repeatingStream = Stream.repeat(Stream.succeed(1), Schedule.forever)
