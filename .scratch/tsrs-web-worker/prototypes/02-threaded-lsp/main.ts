import { Context, Effect, Layer, Schema, Stream } from "effect"
class Clock extends Context.Service<
  Clock,
  { readonly now: Effect.Effect<number> }
>()("Clock") {}
const User = Schema.Struct({ id: Schema.Number, name: Schema.String })
const program = Effect.gen(function* () {
  const clock = yield* Clock
  const now = yield* clock.now
  const label: string = now
  Effect.log("floating")
  const xs = yield* Stream.runCollect(Stream.make(1, 2, 3))
  return { label, xs, u: Schema.decodeUnknownSync(User)({}) }
})
export const run = program.pipe(
  Effect.provide(Layer.succeed(Clock, { now: Effect.succeed(1) })),
)
