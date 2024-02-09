import { Effect, Context, Layer } from "effect"

class A extends Context.Tag("A")<A, { readonly a: number }>() {}

const a = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(Effect.tap(() => Effect.log("initialized")))
)

const program = Effect.scoped(
  Layer.memoize(a).pipe(
    Effect.flatMap((memoized) =>
      Effect.gen(function* (_) {
        yield* _(A, Effect.provide(memoized))
        yield* _(A, Effect.provide(memoized))
      })
    )
  )
)

Effect.runPromise(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message=initialized
*/
