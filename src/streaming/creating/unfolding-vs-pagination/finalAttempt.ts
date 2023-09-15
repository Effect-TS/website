import { Effect, Stream, Option } from "effect"
import { RawData, listPaginated } from "./domain"

const finalAttempt: Stream.Stream<never, Error, RawData> =
  Stream.paginateChunkEffect(0, (pageNumber) =>
    listPaginated(pageNumber).pipe(
      Effect.map((page) => {
        return [
          page.results,
          page.isLast ? Option.none<number>() : Option.some(pageNumber + 1)
        ]
      })
    )
  )

Effect.runPromise(Stream.runCollect(finalAttempt)).then(console.log)
/*
{
  _id: "Chunk",
  values: [ "Result 0-1", "Result 0-2", "Result 1-1", "Result 1-2", "Result 2-1", "Result 2-2" ]
}
*/
