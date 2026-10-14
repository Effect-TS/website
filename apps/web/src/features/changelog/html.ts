import { rehypeHeadingIds } from "@astrojs/markdown-remark"
import type { Root } from "hast"
import type { Root as MdastRoot } from "mdast"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified, type Plugin } from "unified"
import { visit } from "unist-util-visit"

import { rehypeHeadingLinks } from "@/features/docs/rehype-heading-links"

interface MarkdownNode {
  type: string
  value?: string
  children?: Array<MarkdownNode>
}

const LINE_BREAK = /^<br\s*\/?>$/i

// Changelogs hold `Effect<A, E>` outside code and `<br/>` in tables. Neither
// should become live HTML: keep line breaks, show everything else as text.
function remarkLiteralHtml() {
  const rewrite = (node: MarkdownNode): void => {
    if (node.children === undefined) return
    node.children = node.children.map((child) => {
      if (child.type !== "html") {
        rewrite(child)
        return child
      }
      const value = child.value ?? ""
      return LINE_BREAK.test(value.trim())
        ? { type: "break" }
        : { type: "text", value }
    })
  }
  return rewrite
}

const headingPattern = /^h[1-6]$/

// Docs pages get ids from `rehypeHeadingIds`; this scopes them to one release
// so repeated headings like "Patch Changes" stay unique on the page.
const rehypePrefixHeadingIds: Plugin<
  [{ readonly prefix: string | undefined }],
  Root
> = ({ prefix }) => {
  return (tree) => {
    if (prefix === undefined || prefix === "") return
    visit(tree, "element", (node) => {
      if (
        headingPattern.test(node.tagName) &&
        typeof node.properties.id === "string"
      ) {
        node.properties.id = `${prefix}-${node.properties.id}`
      }
    })
  }
}

// Commit-link lists make "Updated dependencies" unreadable on the page.
const DEPENDENCY_COMMITS = /^(\s*- Updated dependencies) \[.*\]:$/gm

const mdastParser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkLiteralHtml)

function hastPipeline(prefix: { readonly prefix: string | undefined }) {
  return unified()
    .use(remarkRehype)
    .use(rehypeHeadingIds)
    .use(rehypePrefixHeadingIds, prefix)
    .use(rehypeHeadingLinks)
    .use(rehypeStringify)
}

// Lockstep releases repeat the same notes in many packages, and the feed
// renders the releases its page already did.
const rendered = new Map<string, string>()

export interface RenderChangelogHtmlOptions {
  readonly idPrefix?: string
}

/** Render one release body to HTML. Raw HTML in the source stays text. */
export function renderChangelogHtml(
  markdown: string,
  options: RenderChangelogHtmlOptions = {},
): string {
  const source = markdown.replace(DEPENDENCY_COMMITS, "$1:")
  const key =
    options.idPrefix === undefined ? source : `${options.idPrefix}\n${source}`
  let html = rendered.get(key)
  if (html === undefined) {
    const prefix =
      options.idPrefix === undefined
        ? undefined
        : slugifyPrefix(options.idPrefix)
    const mdast = mdastParser.runSync(mdastParser.parse(source)) as MdastRoot
    const pipeline = hastPipeline({ prefix })
    html = String(pipeline.stringify(pipeline.runSync(mdast)))
    rendered.set(key, html)
  }
  return html
}

// Release versions (`4.0.0-rc.9`, `0.0.0-next-20260101`) slug the same way
// headings do, so prefixed ids stay URL-safe.
function slugifyPrefix(prefix: string): string {
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
