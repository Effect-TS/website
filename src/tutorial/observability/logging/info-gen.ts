import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.sleep("2 seconds")

// $ExpectType Effect<never, never, void>
const task2 = Effect.sleep("1 seconds")

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(task1)
  yield* _(task2)
  yield* _(Effect.log("done"))
})

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 3 seconds ...
...more infos... level=INFO message=done
*/
