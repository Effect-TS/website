import { Tutorial } from "./src/contentlayer/schema/tutorial"
import { BlogPost } from "./src/contentlayer/schema/blog-post"
import { DocsPage } from "./src/contentlayer/schema/docs-page"
import { makeSource } from "contentlayer2/source-files"
// import remarkGfm from "remark-gfm"
// import type { Options as RehypePrettyCodeOptions } from "rehype-pretty-code"
// import rehypePrettyCode from "rehype-pretty-code"
// import remarkShikiTwoslash from "remark-shiki-twoslash"
// import rehypeRaw from "rehype-raw"
// import { nodeTypes } from "@mdx-js/mdx"
// import codeImport from "remark-code-import"
// import rehypeMdxCodeProps from "rehype-mdx-code-props"
// import rehypeSlug from "rehype-slug"

export const CODE_BLOCK_FILENAME_REGEX = /filename="([^"]+)"/

// const DEFAULT_REHYPE_PRETTY_CODE_OPTIONS: RehypePrettyCodeOptions = {
//   onVisitLine(node: any) {
//     // Prevent lines from collapsing in `display: grid` mode, and
//     // allow empty lines to be copy/pasted
//     if (node.children.length === 0) {
//       node.children = [{ type: "text", value: " " }]
//     }
//   },
//   onVisitHighlightedLine(node: any) {
//     if (!node.properties.className) node.properties.className = []
//     node.properties.className.push("highlighted")
//   },
//   onVisitHighlightedChars(node: any) {
//     node.properties.className = ["highlighted"]
//   },
//   filterMetaString: (meta: string) =>
//     meta.replace(CODE_BLOCK_FILENAME_REGEX, "")
// }

export default makeSource({
  contentDirPath: "content",
  contentDirExclude: ["src"],
  documentTypes: [DocsPage, BlogPost, Tutorial]
  // mdx: {
  //   remarkPlugins: [
  //     // @ts-expect-error
  //     [codeImport, { rootDir: process.cwd() + "/content" }],
  //     // prettier-ignore
  //     // @ts-expect-error
  //     [remarkShikiTwoslash.default, { themes: ["github-dark", "github-light"] }],
  //     // [conditionalShikiTwoslash, { theme: "github-dark" }],
  //     // @ts-expect-error
  //     remarkGfm
  //   ],
  //   rehypePlugins: [
  //     rehypeMdxCodeProps,
  //     [rehypeRaw, { passThrough: nodeTypes }],
  //     [
  //       rehypePrettyCode,
  //       { ...DEFAULT_REHYPE_PRETTY_CODE_OPTIONS, theme: "github-dark" }
  //     ] as any,
  //     [rehypeSlug]
  //   ]
  // }
})
