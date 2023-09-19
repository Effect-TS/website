import { Stream, Effect, Cause } from "effect"

const stream = Stream.fromEffect(Effect.never).pipe(
  Stream.timeoutFailCause(() => Cause.die("timeout"), "2 seconds")
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log, console.error)
/*
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Die",
    defect: "timeout"
  }
}
*/
