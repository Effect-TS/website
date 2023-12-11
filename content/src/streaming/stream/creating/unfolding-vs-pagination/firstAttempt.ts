import { Effect, Stream, Option } from "effect"
import { RawData, listPaginated } from "./domain"

const firstAttempt: Stream.Stream<never, Error, RawData> =
  Stream.unfoldChunkEffect(0, (pageNumber) =>
    listPaginated(pageNumber).pipe(
      Effect.map((page) => {
        if (page.isLast) {
          return Option.none()
        }
        return Option.some([page.results, pageNumber + 1] as const)
      })
    )
  )

Effect.runPromise(Stream.runCollect(firstAttempt)).then(console.log)
/*
{
  _id: "Chunk",
  values: [ "Result 0-1", "Result 0-2", "Result 1-1", "Result 1-2" ]
}
*/
