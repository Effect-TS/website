import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<never, string, never>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.fail("fail!")))

Effect.runPromise(effect).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: "fail!"
  }
}
*/
