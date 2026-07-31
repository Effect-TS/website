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

const getBlogTitleFontSize = (title: string): string => {
  const length = title.length

  if (length <= 32) {
    return "56px"
  }

  if (length <= 52) {
    return "50px"
  }

  if (length <= 72) {
    return "44px"
  }

  return "40px"
}

const getBlogTitleMaxWidth = (title: string): string => {
  return title.length <= 52 ? "1040px" : "980px"
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

const createBlogOgTemplate = ({
  title,
  subtitle,
  bgDataUri,
}: OgTemplateProps & { readonly bgDataUri: string }): OgNode => {
  const titleFontSize = getBlogTitleFontSize(title)
  const titleMaxWidth = getBlogTitleMaxWidth(title)
  const titleLineHeight = title.length > 64 ? 1.14 : 1.08

  const textChildren: Array<OgNode> = []

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

  if (subtitle !== undefined) {
    textChildren.push(
      createNode("div", {
        style: {
          fontSize: "28px",
          color: "#a1a1aa",
          fontWeight: 400,
          marginTop: "20px",
          lineHeight: 1.5,
          maxWidth: "1040px",
          display: "flex",
          fontFamily: "Inter",
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
