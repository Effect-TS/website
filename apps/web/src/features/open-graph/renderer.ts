import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as OpenGraph from "@website/open-graph/OpenGraph"
import blogBgDataUri from "@/assets/og/blog/base.png?inline"
import docsBgDataUri from "@/assets/og/docs/base.png?inline"
import { OPENGRAPH_IMAGE_HEIGHT, OPENGRAPH_IMAGE_WIDTH } from "./constants"
import {
  OpenGraphContent,
  type OpenGraphNode,
  type OpenGraphNodeProps,
} from "./model"

export class OpenGraphRenderer extends Context.Service<
  OpenGraphRenderer,
  {
    readonly render: (
      card: OpenGraphContent,
      requestUrl: URL,
    ) => Effect.Effect<Uint8Array, OpenGraph.OpenGraphError>
  }
>()("website/OpenGraphRenderer") {}

const make = Effect.gen(function* () {
  const openGraph = yield* OpenGraph.OpenGraph

  const render = Effect.fn("OpenGraphRenderer.render")(function* (
    content: OpenGraphContent,
    requestUrl: URL,
  ) {
    const node = OpenGraphContent.$match(content, {
      Api: ({ props }) => createApiTemplate(props),
      Blog: ({ props }) => createBlogTemplate(props),
      Docs: ({ props }) => createDocsTemplate(props),
    })

    return yield* openGraph.render({
      node,
      assetOrigin: requestUrl,
      width: OPENGRAPH_IMAGE_WIDTH,
      height: OPENGRAPH_IMAGE_HEIGHT,
      resvg: {
        fitTo: { mode: "width", value: OPENGRAPH_IMAGE_WIDTH },
      },
    })
  })

  return { render }
})

export const layer = Layer.effect(OpenGraphRenderer, make).pipe(
  Layer.provide(OpenGraph.layer),
)

const createNode = (
  type: string,
  props: OpenGraphNodeProps,
): OpenGraphNode => ({
  type,
  key: null,
  props,
})

const createDocsTemplate = (
  props: Extract<OpenGraphContent, { _tag: "Docs" }>["props"],
): OpenGraphNode => {
  const textChildren: Array<OpenGraphNode> = []

  if (props.subtitle !== undefined) {
    textChildren.push(
      createNode("div", {
        style: {
          fontSize: "22px",
          color: "#a1a1aa",
          fontWeight: 500,
          marginBottom: "40px",
          letterSpacing: "0.01em",
          fontFamily: "JetBrains Mono",
          textTransform: "uppercase",
          display: "flex",
        },
        children: props.subtitle,
      }),
    )
  }

  textChildren.push(
    createNode("div", {
      style: {
        fontSize: "76px",
        fontWeight: 600,
        color: "#ffffff",
        lineHeight: 1.1,
        maxWidth: "1040px",
        letterSpacing: "-0.02em",
        display: "flex",
      },
      children: props.title,
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
        src: docsBgDataUri,
        width: OPENGRAPH_IMAGE_WIDTH,
        height: OPENGRAPH_IMAGE_HEIGHT,
      }),
      createNode("div", {
        style: {
          position: "absolute",
          left: "80px",
          right: "80px",
          top: "320px",
          display: "flex",
          flexDirection: "column",
        },
        children: textChildren,
      }),
    ],
  })
}

const createBlogTemplate = (
  props: Extract<OpenGraphContent, { _tag: "Blog" }>["props"],
): OpenGraphNode => {
  const { fontSize } = getBlogTitleStyles(props.title)

  const textChildren: Array<OpenGraphNode> = []

  textChildren.push(
    createNode("div", {
      style: {
        display: "flex",
        maxWidth: "880px",
        color: "#ffffff",
        fontSize,
        fontFamily: "Inter",
        fontWeight: 700,
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
      },
      children: props.title,
    }),
  )

  if (props.subtitle !== undefined) {
    textChildren.push(
      createNode("div", {
        style: {
          display: "block",
          maxWidth: "800px",
          marginTop: "20px",
          color: "#a1a1aa",
          fontFamily: "Inter",
          fontSize: "28px",
          fontWeight: 400,
          lineHeight: 1.5,
          lineClamp: 2,
          textOverflow: "ellipsis",
        },
        children: props.subtitle,
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
        src: blogBgDataUri,
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

const createApiTemplate = (
  props: Extract<OpenGraphContent, { _tag: "Api" }>["props"],
): OpenGraphNode =>
  createNode("div", {
    style: {
      width: "1200px",
      height: "630px",
      display: "flex",
      position: "relative",
      fontFamily: "JetBrains Mono",
    },
    children: [
      createNode("img", {
        src: docsBgDataUri,
        width: OPENGRAPH_IMAGE_WIDTH,
        height: OPENGRAPH_IMAGE_HEIGHT,
      }),
      createNode("div", {
        style: {
          position: "absolute",
          top: "320px",
          left: "80px",
          right: "80px",
          display: "flex",
          flexDirection: "column",
        },
        children: [
          createNode("div", {
            style: {
              display: "flex",
              alignItems: "center",
            },
            children: [
              createNode("div", {
                style: {
                  color: "#a1a1aa",
                  display: "flex",
                  fontSize: "22px",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  lineHeight: 1.1,
                  textTransform: "uppercase",
                },
                children: props.eyebrow,
              }),
            ],
          }),
          createNode("div", {
            style: {
              color: "#ffffff",
              display: "flex",
              fontSize: "64px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginTop: "30px",
              maxWidth: "1040px",
            },
            children: props.title,
          }),
        ],
      }),
      createNode("div", {
        style: {
          position: "absolute",
          right: "80px",
          bottom: "20px",
          paddingLeft: "12px",
          backgroundColor: "#08090b",
          color: "#a1a1aa",
          display: "flex",
          fontSize: "22px",
          fontWeight: 500,
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          textTransform: "uppercase",
        },
        children: "API Reference",
      }),
    ],
  })

const BLOG_TITLE_FONT_SIZE_STEPS = [52, 48, 44, 40] as const
const BLOG_TITLE_LENGTH_THRESHOLDS = [88, 96, 105] as const

const getBlogTitleStyles = (
  title: string,
): {
  readonly fontSize: string
} => {
  const stepIndex = BLOG_TITLE_LENGTH_THRESHOLDS.findIndex(
    (max) => title.length <= max,
  )

  const fontSize =
    stepIndex === -1
      ? BLOG_TITLE_FONT_SIZE_STEPS[BLOG_TITLE_FONT_SIZE_STEPS.length - 1]
      : BLOG_TITLE_FONT_SIZE_STEPS[stepIndex]

  return {
    fontSize: `${fontSize}px`,
  }
}
