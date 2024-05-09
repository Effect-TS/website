import { Effect, Layer } from "effect"

const make = Effect.gen(function* () {
  return { count: 123 }
})

export class Service extends Effect.Tag("app/Service")<
  Service,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(Service, make)
}
