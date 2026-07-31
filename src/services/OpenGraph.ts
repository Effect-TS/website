import type { CSSProperties } from "react"
import { Resvg } from "@resvg/resvg-js"
import { readFile } from "node:fs/promises"
import satori, { type SatoriOptions } from "satori"
import { OPENGRAPH_IMAGE_HEIGHT, OPENGRAPH_IMAGE_WIDTH } from "@/lib/open-graph"

export interface OgTemplateProps {
  readonly title: string
  readonly subtitle?: string | undefined
}

type SatoriFont = NonNullable<SatoriOptions["fonts"]>[number]

export interface OgAssets {
  readonly fonts: ReadonlyArray<SatoriFont>
  readonly docsBgDataUri: string
  readonly blogBgDataUri: string
}

// ---------------------------------------------------------------------------
// Asset loading — read once, cached for the lifetime of the function.
// Paths are relative to process.cwd() (project root in dev; function root on
// Vercel, where these files are bundled via adapter `includeFiles`).
// ---------------------------------------------------------------------------

let _assets: OgAssets | null = null

export async function loadAssets(): Promise<OgAssets> {
  if (_assets !== null) {
    return _assets
  }
  const [interRegular, interBold, jetbrainsMono, docsBase, blogBase] = await Promise.all([
    readFile("src/assets/fonts/Inter-Regular.ttf"),
    readFile("src/assets/fonts/Inter-Bold.ttf"),
    readFile("src/assets/fonts/JetBrainsMono-Regular.ttf"),
    readFile("src/pages/og/_assets/docs/base.png"),
    readFile("src/pages/og/_assets/blog/base.png"),
  ])
  const fonts: Array<SatoriFont> = [
    {
      name: "Inter",
      style: "normal",
      data: toArrayBuffer(interRegular),
      weight: 400,
    },
    {
      name: "Inter",
      style: "normal",
      data: toArrayBuffer(interBold),
      weight: 700,
    },
    {
      name: "JetBrains Mono",
      style: "normal",
      data: toArrayBuffer(jetbrainsMono),
      weight: 400,
    },
  ]
  _assets = {
    fonts,
    docsBgDataUri: pngToDataUri(docsBase),
    blogBgDataUri: pngToDataUri(blogBase),
  }
  return _assets
}

// ---------------------------------------------------------------------------
// Render — stateless functions that take pre-loaded assets.
// ---------------------------------------------------------------------------

const renderPng = (svg: string): Uint8Array => {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: OPENGRAPH_IMAGE_WIDTH } })
  return new Uint8Array(resvg.render().asPng())
}

export async function renderDocsOg(props: OgTemplateProps, assets: OgAssets): Promise<Uint8Array> {
  const svg = await satori(createDocsTemplate(prepareContentProps(props), assets.docsBgDataUri), {
    width: OPENGRAPH_IMAGE_WIDTH,
    height: OPENGRAPH_IMAGE_HEIGHT,
    fonts: assets.fonts as SatoriOptions["fonts"],
  })
  return renderPng(svg)
}

export async function renderBlogOg(props: OgTemplateProps, assets: OgAssets): Promise<Uint8Array> {
  const svg = await satori(createBlogTemplate(prepareContentProps(props), assets.blogBgDataUri), {
    width: OPENGRAPH_IMAGE_WIDTH,
    height: OPENGRAPH_IMAGE_HEIGHT,
    fonts: assets.fonts as SatoriOptions["fonts"],
  })
  return renderPng(svg)
}

// ---------------------------------------------------------------------------
// OgNode (plain JS objects consumed by Satori — no React needed)
// ---------------------------------------------------------------------------

type OgChild = OgNode | string | number | null
type OgChildren = OgChild | ReadonlyArray<OgChild>

interface OgNodeProps {
  style?: CSSProperties
  children?: OgChildren
  src?: string
  width?: number
  height?: number
}

interface OgNode {
  type: string
  key: string | null
  props: OgNodeProps
}

const toArrayBuffer = (data: Uint8Array): ArrayBuffer => {
  const bytes = Uint8Array.from(data)
  return bytes.buffer
}

const pngToDataUri = (data: Uint8Array): string => {
  const base64 = Buffer.from(data).toString("base64")
  return `data:image/png;base64,${base64}`
}

const safeText = (text: string): string => {
  const emojiPattern = /[\u0080-\u{10FFFF}]+/gu
  return text.replace(emojiPattern, "").trim()
}

const sanitizeOptionalText = (text: string | undefined): string | undefined => {
  if (text === undefined) {
    return text
  }

  const sanitized = safeText(text)
  return sanitized.length === 0 ? undefined : sanitized
}

const sanitizeTemplateProps = (props: OgTemplateProps): OgTemplateProps => {
  return {
    title: safeText(props.title),
    subtitle: sanitizeOptionalText(props.subtitle),
  }
}

const prepareContentProps = (props: OgTemplateProps): OgTemplateProps => {
  return sanitizeTemplateProps(props)
}

const getTitleFontSize = (title: string): string => {
  const length = title.length

  if (length <= 32) {
    return "66px"
  }

  if (length <= 52) {
    return "58px"
  }

  if (length <= 72) {
    return "52px"
  }

  return "46px"
}

const getTitleMaxWidth = (title: string): string => {
  return title.length <= 52 ? "920px" : "860px"
}

// ---------------------------------------------------------------------------
// Blog OG typography spec — structured source of truth for the three text
// elements of the blog OG card. This is the design spec verbatim (not a
// measurement), kept as data (not scattered string literals) so it reads as
// a spec on its own and so createBlogOgTemplate below can't drift from it
// silently. `enforced: false` marks a rule this file does not render —
// currently only blogLabel, which is baked into blog/base.png.
// ---------------------------------------------------------------------------

interface OgTypographyRule {
  readonly fontFamily: string
  readonly fontWeight: number
  readonly fontWeightName: string
  readonly fontSize: number
  readonly lineHeight: number
  readonly color: string
  readonly colorName: string
  readonly maxWidth: number
  readonly maxLines: number
  readonly letterSpacing?: string
  readonly opacity?: number
  readonly enforced: boolean
  /** How text beyond maxLines is handled. Omitted where it can't happen (single fixed string) or isn't enforced by this file. */
  readonly overflow?: "ellipsis"
  readonly notes?: string
}

const BLOG_OG_TYPOGRAPHY = {
  title: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontWeightName: "Bold",
    fontSize: 52,
    lineHeight: 1.15,
    color: "#ffffff",
    colorName: "white",
    maxWidth: 880,
    maxLines: 3,
    letterSpacing: "-0.02em",
    enforced: true,
    notes:
      "letterSpacing is not part of the design spec; kept from the original " +
      "design-ref measurement pass for visual tightness. fontSize steps down " +
      "(see BLOG_TITLE_FONT_SIZE_STEPS) for longer titles so the block stays " +
      "within maxLines instead of overflowing it.",
  },
  description: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontWeightName: "Regular",
    fontSize: 28,
    lineHeight: 1.5,
    color: "#a1a1aa",
    colorName: "zinc-400",
    maxWidth: 800,
    maxLines: 2,
    enforced: true,
    overflow: "ellipsis",
    notes:
      "Enforced with satori's native `lineClamp: maxLines` (display: block) " +
      "— satori supports the CSS line-clamp/textOverflow family directly, so " +
      "the cut happens in layout against the real rendered glyphs, not via a " +
      "char-count guess on the string beforehand.",
  },
  blogLabel: {
    fontFamily: "JetBrains Mono",
    fontWeight: 500,
    fontWeightName: "Medium",
    fontSize: 21,
    lineHeight: 1,
    color: "#a1a1aa",
    colorName: "zinc-400",
    maxWidth: 1200,
    maxLines: 1,
    letterSpacing: "1%",
    opacity: 0.8,
    enforced: false,
    notes:
      "Baked into blog/base.png along with the frame and Effect wordmark " +
      "logo — not rendered by this file. Validated against the current " +
      "asset: font, size, and tracking are consistent with spec, but the " +
      "baked opacity measures ~0.85, not 0.8 — a ~5pt drift to fix upstream " +
      "in the asset if exactness matters, since code can't correct a raster bake.",
  },
} as const satisfies Record<string, OgTypographyRule>

// Chars-per-3-lines thresholds at BLOG_OG_TYPOGRAPHY.title.maxWidth, measured
// with satori using real Inter Bold metrics (title.letterSpacing applied)
// against a representative title string, then given a ~15% margin for
// word-wrap losing some packing efficiency vs a raw char count (words break
// at spaces, not char bounds). steps[0] must equal the spec's base fontSize.
const BLOG_TITLE_FONT_SIZE_STEPS = [52, 48, 44, 40] as const
const BLOG_TITLE_LENGTH_THRESHOLDS = [88, 96, 105] as const

if (BLOG_TITLE_FONT_SIZE_STEPS[0] !== BLOG_OG_TYPOGRAPHY.title.fontSize) {
  throw new Error("BLOG_TITLE_FONT_SIZE_STEPS[0] must match BLOG_OG_TYPOGRAPHY.title.fontSize")
}

// Separate from getTitleFontSize (docs) on purpose — docs and blog use
// different base sizes and maxWidths.
const getBlogTitleFontSize = (title: string): string => {
  const stepIndex = BLOG_TITLE_LENGTH_THRESHOLDS.findIndex((max) => title.length <= max)
  const fontSize =
    stepIndex === -1
      ? BLOG_TITLE_FONT_SIZE_STEPS[BLOG_TITLE_FONT_SIZE_STEPS.length - 1]
      : BLOG_TITLE_FONT_SIZE_STEPS[stepIndex]
  return `${fontSize}px`
}

const createNode = (type: string, props: OgNodeProps): OgNode => {
  return {
    type,
    key: null,
    props,
  }
}

const createDocsOgTemplate = ({
  title,
  subtitle,
  bgDataUri,
}: OgTemplateProps & { readonly bgDataUri: string }): OgNode => {
  const titleFontSize = getTitleFontSize(title)
  const titleMaxWidth = getTitleMaxWidth(title)
  const titleLineHeight = title.length > 64 ? 1.14 : 1.08

  const textChildren: Array<OgNode> = []

  if (subtitle !== undefined) {
    textChildren.push(
      createNode("div", {
        style: {
          fontSize: "19px",
          color: "#7a7a84",
          fontWeight: 400,
          marginBottom: "16px",
          letterSpacing: "-0.01em",
          fontFamily: "JetBrains Mono",
          textTransform: "uppercase",
          display: "flex",
        },
        children: subtitle,
      }),
    )
  }

  textChildren.push(
    createNode("div", {
      style: {
        fontSize: titleFontSize,
        fontWeight: 700,
        color: "#ffffff",
        lineHeight: titleLineHeight,
        maxWidth: titleMaxWidth,
        letterSpacing: "-0.02em",
        display: "flex",
      },
      children: title,
    }),
  )

  return createNode("div", {
    style: {
      width: "1200px",
      height: "630px",
      display: "flex",
      position: "relative",
      fontFamily: "Inter",
    },
    children: [
      createNode("img", {
        src: bgDataUri,
        width: OPENGRAPH_IMAGE_WIDTH,
        height: OPENGRAPH_IMAGE_HEIGHT,
      }),
      createNode("div", {
        style: {
          position: "absolute",
          left: "80px",
          right: "80px",
          bottom: "126px",
          display: "flex",
          flexDirection: "column",
          maxWidth: "900px",
        },
        children: textChildren,
      }),
    ],
  })
}

const createDocsTemplate = (props: OgTemplateProps, docsBgDataUri: string): OgNode => {
  return createDocsOgTemplate({
    title: props.title,
    subtitle: props.subtitle,
    bgDataUri: docsBgDataUri,
  })
}

// Blog OG layout — reverse-engineered from design ref "blog - og - 2.svg" by
// measuring ink bounding boxes (glyph paths in the SVG, pixel scan on the
// rendered reference.png) rather than copying the SVG as a base, then
// corrected against BLOG_OG_TYPOGRAPHY above (source of truth for title/
// description typography — supersedes any earlier measurement-derived value
// that conflicts with it). Positioning notes (typography is data-driven
// above, layout below is not):
//   - Frame (border lines + corner notches) and the Effect wordmark logo
//     are baked into blog/base.png — not drawn here — so the logo's fixed
//     80/56 position isn't reproduced in code.
//   - top: 226px positions the title box so its cap-height ink lands at
//     y≈234, matching the ref (56 top margin + ~39 logo height + 140 gap,
//     minus leading above the glyph caps). Verified by diffing rendered
//     pixel ink-bands against reference.png, not derived analytically.
//   - subtitle marginTop: 20px was tuned (not the ref's nominal "40px" gap
//     annotation) because that annotation measures a different reference
//     point than CSS margin — box leading above/below the ink eats into it.
const createBlogOgTemplate = ({
  title,
  subtitle,
  bgDataUri,
}: OgTemplateProps & { readonly bgDataUri: string }): OgNode => {
  const { title: titleSpec, description: descriptionSpec } = BLOG_OG_TYPOGRAPHY
  const titleFontSize = getBlogTitleFontSize(title)

  const textChildren: Array<OgNode> = []

  textChildren.push(
    createNode("div", {
      style: {
        fontSize: titleFontSize,
        fontWeight: titleSpec.fontWeight,
        color: titleSpec.color,
        lineHeight: titleSpec.lineHeight,
        maxWidth: `${titleSpec.maxWidth}px`,
        letterSpacing: titleSpec.letterSpacing,
        display: "flex",
      },
      children: title,
    }),
  )

  if (subtitle !== undefined) {
    textChildren.push(
      createNode("div", {
        style: {
          fontSize: `${descriptionSpec.fontSize}px`,
          color: descriptionSpec.color,
          fontWeight: descriptionSpec.fontWeight,
          marginTop: "20px",
          lineHeight: descriptionSpec.lineHeight,
          maxWidth: `${descriptionSpec.maxWidth}px`,
          lineClamp: descriptionSpec.maxLines,
          display: "block",
          fontFamily: descriptionSpec.fontFamily,
        },
        children: subtitle,
      }),
    )
  }

  return createNode("div", {
    style: {
      width: "1200px",
      height: "630px",
      display: "flex",
      position: "relative",
      fontFamily: "Inter",
    },
    children: [
      createNode("img", {
        src: bgDataUri,
        width: OPENGRAPH_IMAGE_WIDTH,
        height: OPENGRAPH_IMAGE_HEIGHT,
      }),
      createNode("div", {
        style: {
          position: "absolute",
          left: "80px",
          right: "80px",
          top: "226px",
          display: "flex",
          flexDirection: "column",
        },
        children: textChildren,
      }),
    ],
  })
}

const createBlogTemplate = (props: OgTemplateProps, blogBgDataUri: string): OgNode => {
  return createBlogOgTemplate({
    title: props.title,
    subtitle: props.subtitle,
    bgDataUri: blogBgDataUri,
  })
}
