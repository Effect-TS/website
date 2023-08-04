import { Effect, Ref } from "effect"

export class Counter {
  inc: Effect.Effect<never, never, void>
  dec: Effect.Effect<never, never, void>
  get: Effect.Effect<never, never, number>

  constructor(private value: Ref.Ref<number>) {
    this.inc = Ref.update(this.value, (n) => n + 1)
    this.dec = Ref.update(this.value, (n) => n - 1)
    this.get = Ref.get(this.value)
  }
}

// $ExpectType Effect<never, never, Counter>
export const make = Effect.map(Ref.make(0), (value) => new Counter(value))
