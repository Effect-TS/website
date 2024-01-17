import { Effect, Chunk, Ref, Fiber } from "effect"
import * as ReadLine from "./ReadLine"

// $ExpectType Effect<never, never, Chunk<string>>
const getNames = Ref.make(Chunk.empty<string>()).pipe(
  Effect.flatMap((ref) => {
    const fiber1 = ReadLine.readLine(
      "Please enter a name or `q` to exit: "
    ).pipe(
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
      Effect.fork
    )
    const fiber2 = Effect.fork(
      Effect.forEach(
        ["John", "Jane", "Joe", "Tom"],
        (name) =>
          ref.pipe(
            Ref.update((state) => Chunk.append(state, name)),
            Effect.flatMap(() => Effect.sleep("1 seconds"))
          ),
        { concurrency: "unbounded", discard: true }
      )
    )
    return Effect.all([fiber1, fiber2]).pipe(
      Effect.flatMap(([f1, f2]) =>
        Fiber.join(f1).pipe(Effect.flatMap(() => Fiber.join(f2)))
      ),
      Effect.flatMap(() => Ref.get(ref))
    )
  })
)

Effect.runPromise(getNames).then(console.log)
/*
Output:
Please enter a name or `q` to exit: Alice
Please enter a name or `q` to exit: Bob
Please enter a name or `q` to exit: q
{
  _id: "Chunk",
  values: [ ... ]
}
*/
