import { Shorten } from "@/services/Shorten"
import { Effect, Layer, ManagedRuntime } from "effect"

function makeNextRuntime<R, E>(layer: Layer.Layer<R, E>) {
  const runtime = ManagedRuntime.make(layer)

  const effectAction = <A, E>(effect: Effect.Effect<A, E, R>) =>
    runtime.runPromise(effect)

  return { runtime, effectAction } as const
}

export const { effectAction, runtime } = makeNextRuntime(Shorten.Live)
