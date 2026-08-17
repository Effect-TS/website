/* oxlint-disable typescript/triple-slash-reference -- consumers compile package source without including sibling ambient declarations */
/// <reference path="./wasm.d.ts" />

import wasm from "@resvg/resvg-wasm/index_bg.wasm"
import {
  initWasm,
  Resvg as ResvgClass,
  type ResvgRenderOptions,
} from "@resvg/resvg-wasm"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export class ResvgError extends Data.TaggedError("ResvgError")<{
  readonly cause: unknown
}> {}

export class Resvg extends Context.Service<
  Resvg,
  {
    readonly render: (
      svg: string | Uint8Array<ArrayBufferLike>,
      options?: ResvgRenderOptions,
    ) => Effect.Effect<InstanceType<typeof ResvgClass>, ResvgError>
  }
>()("@website/open-graph/Resvg") {}

const make = Effect.gen(function* () {
  const initResvg = yield* Effect.cached(
    Effect.tryPromise({
      try: () => initWasm(wasm),
      catch: (cause) => new ResvgError({ cause }),
    }),
  )

  const render = Effect.fn("Resvg.render")(function* (
    svg: string | Uint8Array,
    options?: ResvgRenderOptions,
  ) {
    yield* initResvg
    return yield* Effect.try({
      try: () => new ResvgClass(svg, options),
      catch: (cause) => new ResvgError({ cause }),
    })
  })

  return { render }
})

export const layer = Layer.effect(Resvg, make)
