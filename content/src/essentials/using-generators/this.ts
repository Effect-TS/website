import { Effect } from "effect"

class MyService {
  readonly local = 1
  compute() {
    return Effect.gen(this, function* (_) {
      return yield* _(Effect.succeed(this.local + 1))
    })
  }
}

console.log(Effect.runSync(new MyService().compute())) // Output: 2
