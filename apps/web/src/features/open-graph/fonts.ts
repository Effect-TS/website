import {
  experimental_getFontFileURL,
  fontData,
  type FontData,
} from "astro:assets"
import { env } from "cloudflare:workers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Fonts from "@website/open-graph/Fonts"
import type { OpenGraphFontDefinition } from "./model"

const FONT_DEFINITIONS: ReadonlyArray<OpenGraphFontDefinition> = [
  { cssVariable: "--font-og-inter", name: "Inter", weight: 400 },
  { cssVariable: "--font-og-inter", name: "Inter", weight: 600 },
  { cssVariable: "--font-og-inter", name: "Inter", weight: 700 },
  {
    cssVariable: "--font-og-jetbrains-mono",
    name: "JetBrains Mono",
    weight: 400,
  },
  {
    cssVariable: "--font-og-jetbrains-mono",
    name: "JetBrains Mono",
    weight: 500,
  },
  {
    cssVariable: "--font-og-jetbrains-mono",
    name: "JetBrains Mono",
    weight: 700,
  },
]

export const layer = Layer.succeedContext(
  Context.mergeAll(
    Context.make(Fonts.FontCatalog, {
      resolve: Effect.fn("AstroFontCatalog.resolve")(function* (
        assetOrigin: URL,
      ) {
        return yield* Effect.forEach(
          FONT_DEFINITIONS,
          Effect.fnUntraced(function* (definition) {
            const path = yield* findFontPath(definition, assetOrigin)
            const url = yield* Effect.try({
              try: () => experimental_getFontFileURL(path, assetOrigin),
              catch: (cause) =>
                new Fonts.FontResolveError({ assetOrigin, cause }),
            })
            return {
              url,
              name: definition.name,
              style: "normal",
              weight: definition.weight,
            } satisfies Fonts.FontSource
          }),
        )
      }),
    }),
    Context.make(Fonts.FontLoader, {
      load: Effect.fn("CloudflareFontLoader.load")(function* (
        source: Fonts.FontSource,
      ) {
        const response = yield* Effect.tryPromise({
          try: () => env.ASSETS.fetch(new Request(source.url)),
          catch: (cause) => new Fonts.FontLoadError({ source, cause }),
        })
        if (!response.ok) {
          return yield* new Fonts.FontLoadError({
            source,
            cause: `Static asset request returned HTTP ${response.status}`,
          })
        }
        return yield* Effect.tryPromise({
          try: () => response.arrayBuffer(),
          catch: (cause) => new Fonts.FontLoadError({ source, cause }),
        })
      }),
    }),
  ),
)

const findFontPath = (
  definition: OpenGraphFontDefinition,
  assetOrigin: URL,
): Effect.Effect<string, Fonts.FontResolveError> => {
  const variants: ReadonlyArray<FontData> = fontData[definition.cssVariable]

  const variant = variants.find(
    (candidate) =>
      candidate.weight === String(definition.weight) &&
      candidate.style === "normal" &&
      candidate.subset === "latin",
  )

  const source = variant?.src.find((candidate) => candidate.format === "woff")

  return source === undefined
    ? Effect.fail(
        new Fonts.FontResolveError({
          assetOrigin,
          cause: `Astro did not emit ${definition.name} ${definition.weight} as a normal latin WOFF font. Check astro.config.ts.`,
        }),
      )
    : Effect.succeed(source.url)
}
