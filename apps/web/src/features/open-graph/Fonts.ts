import {
  experimental_getFontFileURL,
  fontData,
  type FontData,
} from "astro:assets"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Fonts from "@website/open-graph/Fonts"

interface OgFontDefinition {
  readonly cssVariable: "--font-og-inter" | "--font-og-jetbrains-mono"
  readonly name: "Inter" | "JetBrains Mono"
  readonly weight: 400 | 500 | 600 | 700
}

const definitions = [
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
] as const satisfies ReadonlyArray<OgFontDefinition>

const findFontPath = (
  definition: OgFontDefinition,
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

export const layer = Layer.succeed(Fonts.FontCatalog, {
  resolve: Effect.fn("AstroFontCatalog.resolve")(function* (assetOrigin: URL) {
    return yield* Effect.forEach(definitions, (definition) =>
      Effect.gen(function* () {
        const path = yield* findFontPath(definition, assetOrigin)
        const url = yield* Effect.try({
          try: () => experimental_getFontFileURL(path, assetOrigin),
          catch: (cause) => new Fonts.FontResolveError({ assetOrigin, cause }),
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
})
