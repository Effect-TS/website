import { Stream, Effect, Option, Cause } from "effect"

const s1 = Stream.make(1, 2, 3).pipe(
  Stream.concat(Stream.dieMessage("Oh! Error!")),
  Stream.concat(Stream.make(4, 5))
)

const s2 = Stream.make("a", "b", "c")

const stream = Stream.catchSomeCause(s1, (cause) => {
  if (Cause.isDie(cause)) {
    return Option.some(s2)
  }
  return Option.none()
})

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3, "a", "b", "c" ]
}
*/
