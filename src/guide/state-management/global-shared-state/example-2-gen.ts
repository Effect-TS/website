import { Effect, Chunk, Ref } from "effect"
import * as ReadLine from "./ReadLine"

// $ExpectType Effect<never, never, Chunk<string>>
const getNames = Effect.gen(function* (_) {
  const ref = yield* _(Ref.make(Chunk.empty<string>()))
  while (true) {
    const name = yield* _(
      ReadLine.readLine("Please enter a name or `q` to exit: ")
    )
    if (name === "q") {
      break
    }
    yield* _(Ref.update(ref, (state) => Chunk.append(state, name)))
  }
  return yield* _(Ref.get(ref))
})

Effect.runPromise(getNames).then((result) => console.log(String(result)))
/*
Please enter a name or `q` to exit: Alice
Please enter a name or `q` to exit: Bob
Please enter a name or `q` to exit: q
Chunk(Alice, Bob)
*/
