import { Effect, Stream, Option } from "effect"
import { RawData, listPaginated } from "./domain"

const secondAttempt: Stream.Stream<never, Error, RawData> =
  Stream.unfoldChunkEffect(Option.some(0), (pageNumber) =>
    Option.match(pageNumber, {
      // We already hit the last page
      onNone: () => Effect.succeed(Option.none()),
      // We did not hit the last page yet
      onSome: (pageNumber) =>
        listPaginated(pageNumber).pipe(
          Effect.map((page) =>
            Option.some([
              page.results,
              page.isLast ? Option.none() : Option.some(pageNumber + 1)
            ])
          )
        )
    })
  )

Effect.runPromise(Stream.runCollect(secondAttempt)).then(console.log)
/*
{
  _id: "Chunk",
  values: [ "Result 0-1", "Result 0-2", "Result 1-1", "Result 1-2", "Result 2-1", "Result 2-2" ]
}
*/
