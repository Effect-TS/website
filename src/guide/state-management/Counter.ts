import { Effect, Ref } from "effect"

export class Counter {
  constructor(private value: Ref.Ref<number>) {}

  get inc() {
    return Ref.update(this.value, (n) => n + 1)
  }

  get dec() {
    return Ref.update(this.value, (n) => n - 1)
  }

  get get() {
    return Ref.get(this.value)
  }
}

// $ExpectType Effect<never, never, Counter>
export const make = Effect.map(Ref.make(0), (value) => new Counter(value))
