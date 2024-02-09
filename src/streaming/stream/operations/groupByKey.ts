import { Stream, GroupBy, Effect, Chunk } from "effect"

class Exam {
  constructor(readonly person: string, readonly score: number) {}
}

const examResults = [
  new Exam("Alex", 64),
  new Exam("Michael", 97),
  new Exam("Bill", 77),
  new Exam("John", 78),
  new Exam("Bobby", 71)
]

// $ExpectType GroupBy<never, never, number, Exam>
const groupByKeyResult = Stream.fromIterable(examResults).pipe(
  Stream.groupByKey((exam) => Math.floor(exam.score / 10) * 10)
)

// $ExpectType Stream<readonly [number, number], never, never>
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
    [ 60, 1 ], [ 90, 1 ], [ 70, 3 ]
  ]
}
*/
