import { Effect, Ref } from "effect"

export class Counter {
  inc: Effect.Effect<void>
  dec: Effect.Effect<void>
  get: Effect.Effect<number>

  constructor(private value: Ref.Ref<number>) {
    this.inc = Ref.update(this.value, (n) => n + 1)
    this.dec = Ref.update(this.value, (n) => n - 1)
    this.get = Ref.get(this.value)
  }
}

// $ExpectType Effect<Counter, never, never>
export const make = Effect.map(Ref.make(0), (value) => new Counter(value))
