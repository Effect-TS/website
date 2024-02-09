import { Stream, Random, Effect, Option } from "effect"

// $ExpectType Stream<number, never, never>
const ints = Stream.unfoldEffect(1, (n) =>
  Random.nextBoolean.pipe(
    Effect.map((b) => (b ? Option.some([n, -n]) : Option.some([n, n])))
  )
)
