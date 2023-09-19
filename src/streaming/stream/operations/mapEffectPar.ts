import { Stream, Effect } from "effect"

const getUrls = Effect.succeed(["url0", "url1", "url2"])

const fetchUrl = (url: string) =>
  Effect.succeed([
    `Resource 0-${url}`,
    `Resource 1-${url}`,
    `Resource 2-${url}`
  ])

const stream = Stream.fromIterableEffect(getUrls).pipe(
  Stream.mapEffect(fetchUrl, { concurrency: 4 })
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ "Resource 0-url0", "Resource 1-url0", "Resource 2-url0" ], [ "Resource 0-url1", "Resource 1-url1",
      "Resource 2-url1" ], [ "Resource 0-url2", "Resource 1-url2", "Resource 2-url2" ]
  ]
}
*/
