import {
  experimental_getFontFileURL,
  fontData,
  type FontData,
} from "astro:assets"
import { Cache, Effect, Exit, Layer } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type { OgFont } from "@/services/OpenGraph"
import { OgFonts } from "./Fonts"
import { OgFontError } from "./Model"

interface OgFontDefinition {
  readonly cssVariable: "--font-og-inter" | "--font-og-jetbrains-mono"
  readonly name: "Inter" | "JetBrains Mono"
  readonly weight: 400 | 700
}

const definitions = [
  { cssVariable: "--font-og-inter", name: "Inter", weight: 400 },
  { cssVariable: "--font-og-inter", name: "Inter", weight: 700 },
  {
    cssVariable: "--font-og-jetbrains-mono",
    name: "JetBrains Mono",
    weight: 400,
  },
  {
    cssVariable: "--font-og-jetbrains-mono",
    name: "JetBrains Mono",
    weight: 700,
  },
] as const satisfies ReadonlyArray<OgFontDefinition>

const findFontPath = (
  definition: OgFontDefinition,
): Effect.Effect<string, OgFontError> => {
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
        new OgFontError({
          font: `${definition.name} ${definition.weight}`,
          cause:
            "Astro did not emit the required normal latin WOFF variant. Check astro.config.ts.",
        }),
      )
    : Effect.succeed(source.url)
}

export const OgFontsLive = Layer.effect(
  OgFonts,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    const loadFont = (definition: OgFontDefinition, origin: string) =>
      Effect.gen(function* () {
        const font = `${definition.name} ${definition.weight}`
        const path = yield* findFontPath(definition)
        const url = yield* Effect.try({
          try: () => experimental_getFontFileURL(path, new URL(origin)),
          catch: (cause) => new OgFontError({ font, cause }),
        })
        const response = yield* client
          .get(url)
          .pipe(Effect.mapError((cause) => new OgFontError({ font, cause })))
        if (response.status < 200 || response.status >= 300) {
          return yield* new OgFontError({
            font,
            cause: `Font request returned HTTP ${response.status}`,
          })
        }
        const data = yield* response.arrayBuffer.pipe(
          Effect.mapError((cause) => new OgFontError({ font, cause })),
        )
        return {
          name: definition.name,
          style: "normal",
          data,
          weight: definition.weight,
        } satisfies OgFont
      }).pipe(
        Effect.withSpan("og.font.load", {
          attributes: { font: definition.name, weight: definition.weight },
        }),
      )

    const cache = yield* Cache.makeWith(
      (origin: string) =>
        Effect.forEach(
          definitions,
          (definition) => loadFont(definition, origin),
          {
            concurrency: "unbounded",
          },
        ),
      {
        capacity: 4,
        timeToLive: (exit) => (Exit.isSuccess(exit) ? "1 day" : "0 millis"),
      },
    )

    return {
      load: (requestUrl: URL) => Cache.get(cache, requestUrl.origin),
    } as const
  }),
)
