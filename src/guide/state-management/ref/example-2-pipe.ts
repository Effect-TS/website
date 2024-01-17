import { Effect, Chunk, Ref } from "effect"
import * as ReadLine from "./ReadLine"

// $ExpectType Effect<never, never, Chunk<string>>
const getNames = Ref.make(Chunk.empty<string>()).pipe(
  Effect.flatMap((ref) =>
    ReadLine.readLine("Please enter a name or `q` to exit: ").pipe(
      Effect.repeat({ while: (name) => {
        if (name === "q") {
          return Effect.succeed(false)
        } else {
          return ref.pipe(
            Ref.update((state) => Chunk.append(state, name)),
            Effect.as(true)
          )
        }
      } }),
      Effect.flatMap(() => Ref.get(ref))
    )
  )
)

Effect.runPromise(getNames).then(console.log)
/*
Output:
Please enter a name or `q` to exit: Alice
Please enter a name or `q` to exit: Bob
Please enter a name or `q` to exit: q
{
  _id: "Chunk",
  values: [ "Alice", "Bob" ]
}
*/
