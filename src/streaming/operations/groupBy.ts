import { Stream, GroupBy, Effect, Chunk } from "effect"

// $ExpectType GroupBy<never, never, string, string>
const groupByKeyResult = Stream.fromIterable([
  "Mary",
  "James",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Rebecca",
  "Peter"
]).pipe(Stream.groupBy((name) => Effect.succeed([name.substring(0, 1), name])))

// $ExpectType Stream<never, never, readonly [string, number]>
const stream = GroupBy.evaluate(groupByKeyResult, (key, stream) =>
  Stream.fromEffect(
    Stream.runCollect(stream).pipe(
      Effect.map((chunk) => [key, Chunk.size(chunk)] as const)
    )
  )
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ "M", 1 ], [ "J", 3 ], [ "R", 2 ], [ "P", 2 ]
  ]
}
*/
