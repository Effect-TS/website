import { Stream, Effect, Console } from "effect"

// Creating a single-valued stream from a scoped resource
const stream = Stream.scoped(
  Effect.acquireUseRelease(
    Console.log("acquire"),
    () => Console.log("use"),
    () => Console.log("release")
  )
)
