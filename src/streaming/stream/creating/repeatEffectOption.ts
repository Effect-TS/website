import { Stream, Effect, Option } from "effect"

const drainIterator = <A>(it: Iterator<A>): Stream.Stream<never, never, A> =>
  Stream.repeatEffectOption(
    Effect.sync(() => it.next()).pipe(
      Effect.flatMap((res) => {
        if (res.done) {
          return Effect.fail(Option.none())
        }
        return Effect.succeed(res.value)
      })
    )
  )
