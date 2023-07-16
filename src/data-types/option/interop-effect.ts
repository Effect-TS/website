import { Effect, Option } from "effect"

const head = <A>(as: ReadonlyArray<A>): Option.Option<A> =>
  as.length > 0 ? Option.some(as[0]) : Option.none()

console.log(
  Effect.runSync(Effect.succeed([1, 2, 3]).pipe(Effect.flatMap(head)))
) // Output: 1

Effect.runSync(Effect.succeed([]).pipe(Effect.flatMap(head))) // Throws NoSuchElementException
