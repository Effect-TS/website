import { Effect, Chunk, Ref } from "effect"
import * as ReadLine from "./ReadLine"

// $ExpectType Effect<never, never, Chunk.Chunk<string>>
const getNames = Effect.flatMap(Ref.make(Chunk.empty<string>()), (ref) =>
  ReadLine.readLine("Please enter a name or `q` to exit: ").pipe(
    Effect.repeatWhileEffect((name) => {
      if (name === "q") {
        return Effect.succeed(false)
      } else {
        return ref.pipe(
          Ref.update((state) => Chunk.append(state, name)),
          Effect.as(true)
        )
      }
    }),
    Effect.flatMap(() => Ref.get(ref))
  )
)

Effect.runPromise(getNames).then((result) => console.log(String(result)))
/*
Please enter a name or `q` to exit: Alice
Please enter a name or `q` to exit: Bob
Please enter a name or `q` to exit: q
Chunk(Alice, Bob)
*/
