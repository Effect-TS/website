import { Effect, Ref } from "effect"

export class Counter {
  constructor(private value: Ref.Ref<number>) {}
  inc = Ref.update(this.value, (n) => n + 1)
  dec = Ref.update(this.value, (n) => n - 1)
  get = Ref.get(this.value)
}

// $ExpectType Effect<never, never, Counter>
export const make = Ref.make(0).pipe(Effect.map((value) => new Counter(value)))
