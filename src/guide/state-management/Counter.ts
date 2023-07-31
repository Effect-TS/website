import { Effect, Ref } from "effect"

export class Counter {
  constructor(private value: Ref.Ref<number>) {}
  inc = Ref.update(this.value, (n) => n + 1)
  dec = Ref.update(this.value, (n) => n - 1)
  get = Ref.get(this.value)
}

// $ExpectType Effect<never, never, Counter>
export const make = Effect.map(Ref.make(0), (value) => new Counter(value))
