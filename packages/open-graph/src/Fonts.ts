import type { Font, FontStyle, FontWeight } from "satori/standalone"
import * as Context from "effect/Context"
import * as Cache from "effect/Cache"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"

export interface FontSource {
  readonly url: string | URL
  readonly name: string
  readonly weight?: FontWeight
  readonly style?: FontStyle
  readonly lang?: string
}

export class FontResolveError extends Data.TaggedError("FontResolveError")<{
  readonly assetOrigin: URL
  readonly cause: unknown
}> {}

export class FontLoadError extends Data.TaggedError("FontLoadError")<{
  readonly source: FontSource
  readonly cause: unknown
}> {}

export class FontCatalog extends Context.Service<
  FontCatalog,
  {
    readonly resolve: (
      assetOrigin: URL,
    ) => Effect.Effect<ReadonlyArray<FontSource>, FontResolveError>
  }
>()("@website/open-graph/Fonts/Catalog") {}

export class FontLoader extends Context.Service<
  FontLoader,
  {
    readonly load: (
      source: FontSource,
    ) => Effect.Effect<ArrayBuffer, FontLoadError>
  }
>()("@website/open-graph/Fonts/Loader") {}

export class Fonts extends Context.Service<
  Fonts,
  {
    readonly load: (
      assetOrigin: URL,
    ) => Effect.Effect<ReadonlyArray<Font>, FontResolveError | FontLoadError>
  }
>()("@website/open-graph/Fonts/FontsCatalog") {}

export const layer = Layer.effect(
  Fonts,
  Effect.gen(function* () {
    const catalog = yield* FontCatalog
    const loader = yield* FontLoader

    const loadFont = Effect.fnUntraced(function* (source: FontSource) {
      const data = yield* loader.load(source)
      const { url: _, ...metadata } = source
      return { ...metadata, data } satisfies Font
    })

    const cache = yield* Cache.makeWith(
      (origin: string) =>
        catalog.resolve(new URL(origin)).pipe(
          Effect.flatMap((sources) =>
            Effect.forEach(sources, loadFont, {
              concurrency: "unbounded",
            }),
          ),
        ),
      {
        capacity: 4,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? "1 day" : "0 millis"),
      },
    )

    return {
      load: (assetOrigin: URL) => Cache.get(cache, assetOrigin.origin),
    }
  }),
)
