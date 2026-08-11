import {
  experimental_getFontFileURL,
  fontData,
  type FontData,
} from "astro:assets"
import type { OgFont } from "./OpenGraph.ts"

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

const findFontPath = (definition: OgFontDefinition): string => {
  const variants: ReadonlyArray<FontData> = fontData[definition.cssVariable]
  const variant = variants.find(
    (candidate) =>
      candidate.weight === String(definition.weight) &&
      candidate.style === "normal" &&
      candidate.subset === "latin" &&
      candidate.src.some((source) => source.format === "woff"),
  )
  const source = variant?.src.find((candidate) => candidate.format === "woff")

  if (source === undefined) {
    throw new Error(
      `Cannot render OG images because Astro did not provide the normal ${definition.weight} ${definition.name} WOFF font. Check the font variants in astro.config.ts.`,
    )
  }

  return source.url
}

const fetchFont = async (
  definition: OgFontDefinition,
  requestUrl: URL,
): Promise<OgFont> => {
  const path = findFontPath(definition)
  const url = experimental_getFontFileURL(path, requestUrl)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Cannot render OG images because ${definition.name} ${definition.weight} could not be fetched from ${url} (${response.status} ${response.statusText}).`,
    )
  }

  return {
    name: definition.name,
    style: "normal",
    data: await response.arrayBuffer(),
    weight: definition.weight,
  }
}

let fontsPromise: Promise<ReadonlyArray<OgFont>> | undefined

export function loadOgFonts(requestUrl: URL): Promise<ReadonlyArray<OgFont>> {
  fontsPromise ??= Promise.all(
    definitions.map((definition) => fetchFont(definition, requestUrl)),
  ).catch((error: unknown) => {
    fontsPromise = undefined
    throw error
  })
  return fontsPromise
}
