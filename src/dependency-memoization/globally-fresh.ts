import { Effect, Context, Layer } from "effect"

class A extends Context.Tag("A")<A, { readonly a: number }>() {}

class B extends Context.Tag("B")<B, { readonly b: string }>() {}

class C extends Context.Tag("C")<C, { readonly c: boolean }>() {}

const a = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(Effect.tap(() => Effect.log("initialized")))
)

const b = Layer.effect(
  B,
  Effect.gen(function* (_) {
    const { a } = yield* _(A)
    return { b: String(a) }
  })
)

const c = Layer.effect(
  C,
  Effect.gen(function* (_) {
    const { a } = yield* _(A)
    return { c: a > 0 }
  })
)

// $ExpectType Effect<void, never, B | C>
const program = Effect.gen(function* (_) {
  yield* _(B)
  yield* _(C)
})

// $ExpectType Effect<void, never, never>
const runnable = Effect.provide(
  program,
  Layer.merge(
    Layer.provide(b, Layer.fresh(a)),
    Layer.provide(c, Layer.fresh(a))
  )
)

Effect.runPromise(runnable)
/*
Output:
timestamp=... level=INFO fiber=#2 message=initialized
timestamp=... level=INFO fiber=#3 message=initialized
*/
