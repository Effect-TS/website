import { Tutorial } from "./src/contentlayer/schema/tutorial"
import { BlogPost } from "./src/contentlayer/schema/blog-post"
import { DocsPage } from "./src/contentlayer/schema/docs-page"
import { makeSource } from "contentlayer2/source-files"
import remarkGfm from "remark-gfm"
import type { Options as RehypePrettyCodeOptions } from "rehype-pretty-code"
import rehypePrettyCode from "rehype-pretty-code"
import { transformerTwoslash, rendererClassic } from "@shikijs/twoslash"
import rehypeRaw from "rehype-raw"
import { nodeTypes } from "@mdx-js/mdx"
import codeImport from "remark-code-import"
import rehypeMdxCodeProps from "rehype-mdx-code-props"
import rehypeSlug from "rehype-slug"

export const CODE_BLOCK_FILENAME_REGEX = /filename="([^"]+)"/

const DEFAULT_REHYPE_PRETTY_CODE_OPTIONS: RehypePrettyCodeOptions = {
  onVisitLine(node: any) {
    // Prevent lines from collapsing in `display: grid` mode, and
    // allow empty lines to be copy/pasted
    if (node.children.length === 0) {
      node.children = [{ type: "text", value: " " }]
    }
  },
  onVisitHighlightedLine(node: any) {
    if (!node.properties.className) node.properties.className = []
    node.properties.className.push("highlighted")
  },
  onVisitHighlightedChars(node: any) {
    node.properties.className = ["highlighted"]
  },
  filterMetaString: (meta: string) =>
    meta.replace(CODE_BLOCK_FILENAME_REGEX, "")
}

export default makeSource({
  contentDirPath: "content",
  contentDirExclude: ["src"],
  documentTypes: [DocsPage, BlogPost, Tutorial],
  mdx: {
    remarkPlugins: [
      [codeImport, { rootDir: process.cwd() + "/content" }],
      remarkGfm
    ],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          ...DEFAULT_REHYPE_PRETTY_CODE_OPTIONS,
          theme: {
            dark: "github-dark",
            light: "github-light"
          },
          transformers: [
            transformerTwoslash({
              explicitTrigger: true,
              renderer: rendererClassic()
            })
          ]
        } satisfies RehypePrettyCodeOptions
      ],
      [rehypeRaw, { passThrough: nodeTypes }],
      rehypeMdxCodeProps,
      rehypeSlug
    ]
  }
})
