import { Stream, Effect, Random } from "effect"

const s2 = Stream.repeatEffect(
  Effect.gen(function* (_) {
    const nextInt = yield* _(Random.nextInt)
    const number = Math.abs(nextInt % 10)
    console.log(`random number: ${number}`)
    return number
  })
).pipe(Stream.take(3))

Effect.runPromise(Stream.runCollect(s2)).then(console.log)
/*
Output:
random number: 4
random number: 2
random number: 7
{
  _id: "Chunk",
  values: [ 4, 2, 7 ]
}
*/

const s3 = Stream.drain(s2)

Effect.runPromise(Stream.runCollect(s3)).then(console.log)
/*
random number: 1
random number: 6
random number: 0
Output:
{
  _id: "Chunk",
  values: []
}
*/
