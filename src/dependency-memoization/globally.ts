import { Effect, Context, Layer } from "effect"

interface A {
  readonly a: number
}

const A = Context.Tag<A>()

interface B {
  readonly b: string
}

const B = Context.Tag<B>()

interface C {
  readonly c: boolean
}

const C = Context.Tag<C>()

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

// $ExpectType Effect<B | C, never, void>
const program = Effect.gen(function* (_) {
  yield* _(B)
  yield* _(C)
})

// $ExpectType Effect<never, never, void>
const runnable = Effect.provide(
  program,
  Layer.merge(Layer.provide(b, a), Layer.provide(c, a))
)

Effect.runPromise(runnable)
/*
Output:
timestamp=... level=INFO fiber=#2 message=initialized
*/
