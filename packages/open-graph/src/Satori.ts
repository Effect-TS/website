/* oxlint-disable typescript/triple-slash-reference -- consumers compile package source without including sibling ambient declarations */
/// <reference path="./wasm.d.ts" />

import yogaWasm from "satori/yoga.wasm"
import satori, { init, type SatoriOptions } from "satori/standalone"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class SatoriError extends Data.TaggedError("SatoriError")<{
  readonly cause: unknown
}> {}

export type VNode = Parameters<typeof satori>[0]

export class Satori extends Context.Service<
  Satori,
  {
    readonly svg: (
      node: VNode,
      options: SatoriOptions,
    ) => Effect.Effect<string, SatoriError>
  }
>()("@website/open-graph/Satori") {}

const make = Effect.gen(function* () {
  const initSatori = yield* Effect.cached(
    Effect.tryPromise({
      try: () => init(yogaWasm),
      catch: (cause) => new SatoriError({ cause }),
    }),
  )

  const svg = Effect.fn("Satori.svg")(function* (
    node: VNode,
    options: SatoriOptions,
  ) {
    yield* initSatori
    return yield* Effect.tryPromise({
      try: () => satori(node, options),
      catch: (cause) => new SatoriError({ cause }),
    })
  })

  return { svg }
})

export const layer = Layer.effect(Satori, make)
