import { Tutorial } from "./src/contentlayer/schema/tutorial"
import { BlogPost } from "./src/contentlayer/schema/blog-post"
import { DocsPage } from "./src/contentlayer/schema/docs-page"
import { makeSource } from "contentlayer2/source-files"
import remarkGfm from "remark-gfm"
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions
} from "rehype-pretty-code"
import { transformerTwoslash } from "@shikijs/twoslash"
import rehypeRaw from "rehype-raw"
import { nodeTypes } from "@mdx-js/mdx"
import rehypeSlug from "rehype-slug"

const DEFAULT_REHYPE_PRETTY_CODE_OPTIONS: RehypePrettyCodeOptions = {
  onVisitLine(node) {
    // Prevent lines from collapsing in `display: grid` mode, and
    // allow empty lines to be copy/pasted
    if (node.children.length === 0) {
      node.children = [{ type: "text", value: " " }]
    }
  },
  onVisitHighlightedLine(node) {
    if (!node.properties.className) node.properties.className = []
    node.properties.className.push("highlighted")
  },
  onVisitHighlightedChars(node) {
    node.properties.className = ["highlighted"]
  }
}

export default makeSource({
  contentDirPath: "content",
  contentDirExclude: ["src"],
  documentTypes: [DocsPage, BlogPost, Tutorial],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [rehypeRaw, { passThrough: nodeTypes }],
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
              onTwoslashError: (error, code) => {
                console.error(error, code)
              },
              onShikiError: (error, code) => {
                console.error(error, code)
              }
            })
          ]
        } satisfies RehypePrettyCodeOptions
      ],
      rehypeSlug
    ]
  }
})
