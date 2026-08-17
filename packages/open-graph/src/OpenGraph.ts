import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ResvgRenderOptions } from "@resvg/resvg-wasm"
import type { SatoriOptions } from "satori/standalone"
import {
  FontLoadError,
  FontResolveError,
  Fonts,
  layer as fontsLayer,
} from "./Fonts.ts"
import { Resvg, ResvgError, layer as resvgLayer } from "./Resvg.ts"
import {
  Satori,
  SatoriError,
  type VNode,
  layer as satoriLayer,
} from "./Satori.ts"

export type SatoriRenderOptions = Omit<
  SatoriOptions,
  "fonts" | "height" | "width"
>

export interface RenderRequest {
  readonly node: VNode
  readonly assetOrigin: URL
  readonly width: number
  readonly height: number
  readonly satori?: SatoriRenderOptions
  readonly resvg?: ResvgRenderOptions
}

type RenderCause = FontResolveError | FontLoadError | SatoriError | ResvgError

export class OpenGraphError extends Data.TaggedError("OpenGraphError")<{
  readonly cause: RenderCause
}> {}

export class OpenGraph extends Context.Service<
  OpenGraph,
  {
    readonly render: (
      request: RenderRequest,
    ) => Effect.Effect<Uint8Array, OpenGraphError>
  }
>()("@website/open-graph/OpenGraph") {}

const make = Effect.gen(function* () {
  const fonts = yield* Fonts
  const resvg = yield* Resvg
  const satori = yield* Satori

  const render = Effect.fn("OpenGraph.render")(
    function* (request: RenderRequest) {
      const loadedFonts = yield* fonts.load(request.assetOrigin)

      const svg = yield* satori.svg(request.node, {
        ...request.satori,
        width: request.width,
        height: request.height,
        fonts: [...loadedFonts],
      })

      const renderer = yield* resvg.render(svg, request.resvg)

      return yield* Effect.acquireUseRelease(
        Effect.try({
          try: () => renderer.render(),
          catch: (cause) => new ResvgError({ cause }),
        }),
        (image) => Effect.succeed(image.asPng()),
        (image) =>
          Effect.try({
            try: () => image.free(),
            catch: (cause) => new ResvgError({ cause }),
          }),
      )
    },
    Effect.mapError((cause) => new OpenGraphError({ cause })),
  )

  return { render }
})

export const layer = Layer.effect(OpenGraph, make).pipe(
  Layer.provide(Layer.mergeAll(fontsLayer, resvgLayer, satoriLayer)),
)
