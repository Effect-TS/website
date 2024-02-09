import { Effect, Context } from "effect"

export class Random extends Context.Tag("Random")<
  Random,
  {
    readonly next: Effect.Effect<number>
  }
>() {}
