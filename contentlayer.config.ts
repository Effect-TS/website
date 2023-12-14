// TODO remove eslint-disable when fixed https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import { BlogPost } from "./src/contentlayer/schema/blog-post"
import { DocsPage } from "./src/contentlayer/schema/docs-page"
import { makeSource } from "contentlayer/source-files"
import remarkGfm from "remark-gfm"
import type { Options as RehypePrettyCodeOptions } from "rehype-pretty-code"
import rehypePrettyCode from "rehype-pretty-code"
import remarkShikiTwoslash from "remark-shiki-twoslash"
import rehypeRaw from "rehype-raw"
import { nodeTypes } from "@mdx-js/mdx"
import codeImport from "remark-code-import"

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

const conditionalShikiTwoslash = (options: any) => (tree: any, file: any) => {
  const sourceFilePath = file.data.rawDocumentData.sourceFilePath
  if (sourceFilePath.includes("essentials")) {
    // @ts-expect-error xxx
    return remarkShikiTwoslash.default(options)(tree, file)
  }
}

export default makeSource({
  contentDirPath: "content",
  contentDirExclude: ["src"],
  documentTypes: [DocsPage, BlogPost],
  mdx: {
    remarkPlugins: [
      [codeImport, { rootDir: process.cwd() + "/content" }],
      // // @ts-expect-error
      // [remarkShikiTwoslash.default, { theme: "github-dark" }],
      [conditionalShikiTwoslash, { theme: "github-dark" }],
      remarkGfm
    ],
    rehypePlugins: [
      [rehypeRaw, { passThrough: nodeTypes }],
      [
        rehypePrettyCode,
        { ...DEFAULT_REHYPE_PRETTY_CODE_OPTIONS, theme: "github-dark" }
      ] as any
    ]
  }
})
