import { Stream, Console, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(
  Stream.concat(Stream.dieMessage("Oh! Boom!")),
  Stream.concat(Stream.make(4, 5)),
  Stream.onError(() =>
    Console.log(
      "Stream application closed! We are doing some cleanup jobs."
    ).pipe(Effect.orDie)
  )
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
Stream application closed! We are doing some cleanup jobs.
error: RuntimeException: Oh! Boom!
*/
