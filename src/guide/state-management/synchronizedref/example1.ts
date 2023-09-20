import { Effect, SynchronizedRef } from "effect"

const program = Effect.gen(function* (_) {
  const ref = yield* _(SynchronizedRef.make("current"))
  const updateEffect = Effect.succeed("update")
  yield* _(SynchronizedRef.updateEffect(ref, () => updateEffect))
  const value = yield* _(SynchronizedRef.get(ref))
  return value
})

Effect.runPromise(program).then(console.log)
/*
Output:
update
*/
