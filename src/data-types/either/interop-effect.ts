import { Effect, Either } from "effect"

const head = <A>(array: ReadonlyArray<A>): Either.Either<string, A> =>
  array.length > 0 ? Either.right(array[0]) : Either.left("empty array")

const foo = Effect.runSync(Effect.flatMap(Effect.succeed([1, 2, 3]), head))
console.log(foo) // Output: 1

const bar = Effect.runSync(Effect.flatMap(Effect.succeed([]), head)) // Throws "empty array"
