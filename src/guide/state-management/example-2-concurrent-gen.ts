import { Effect, Chunk, Ref, Fiber } from "effect"
import * as ReadLine from "./ReadLine"

// $ExpectType Effect<never, never, Chunk<string>>
const getNames = Effect.gen(function* (_) {
  const ref = yield* _(Ref.make(Chunk.empty<string>()))
  const fiber1 = yield* _(
    Effect.fork(
      Effect.gen(function* (_) {
        while (true) {
          const name = yield* _(
            ReadLine.readLine("Please enter a name or `q` to exit: ")
          )
          if (name === "q") {
            break
          }
          yield* _(Ref.update(ref, (state) => Chunk.append(state, name)))
        }
      })
    )
  )
  const fiber2 = yield* _(
    Effect.fork(
      Effect.gen(function* (_) {
        for (const name of ["John", "Jane", "Joe", "Tom"]) {
          yield* _(Ref.update(ref, (state) => Chunk.append(state, name)))
          yield* _(Effect.sleep("1 seconds"))
        }
      })
    )
  )
  yield* _(Fiber.join(fiber1))
  yield* _(Fiber.join(fiber2))
  return yield* _(Ref.get(ref))
})

Effect.runPromise(getNames).then((result) => console.log(String(result)))
/*
Output:
Please enter a name or `q` to exit: Alice
Please enter a name or `q` to exit: Bob
Please enter a name or `q` to exit: q
Chunk(John, Jane, Alice, Joe, Bob, Tom)
*/
